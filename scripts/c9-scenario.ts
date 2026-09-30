// Stage C9 fission scenarios and the T-FIS scoring (docs/realism-design.md "C9 pre-registration"), simulation truth.
//
//   pnpm exec tsx scripts/c9-scenario.ts [--kinds baseline,large,large-off] [--years 40] [--seeds 5303,5404,5505,5606,5707]
//                                        [--profile field] [--workers 2] [--out artifacts/validation/c9] [--days N]
//
// Kinds (all at natural aging):
//   baseline   default communities, fissionOn 1, assocBondW 0.3 (T-FIS-1: no fission below 10 adult males)
//   large      the West community cloned up to >= 60 members and >= 15 adult males (mother-offspring units and adult
//              males), popCap 180, fissionOn 1, assocBondW 0.3 (T-FIS-1..5, range divergence)
//   large-off  the same start with fissionOn 0: the paired baseline intercommunity killing rate (T-FIS-3)
// --days overrides --years (dry runs). Outputs <out>/<kind>-seed<N>.json and <out>/c9-summary.{json,md}.
import { mkdirSync, writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { createWorld, tickWorld } from '../src/simulation';
import { isAdultMale } from '../src/sim/hierarchy';
import type { Profile } from '../src/sim/params';
import { index, ix, markAliveChanged, simOf } from '../src/sim/state';
import type { Chimp, World } from '../src/types';
import { runPool } from './lib/pool';

const MONTH_H = 24 * 365 / 12, YEAR_H = 24 * 365;
const ON = { fissionOn: 1, assocBondW: 0.3 };
const T_FIS5_BAND: [number, number] = [6.1905, 11.4069]; // artifacts/validation/c9/fission-bands.json (Ngogo 2017-2022), fixed before any run

interface Job { seed: number; kind: 'baseline' | 'large' | 'large-off'; days: number; profile: Profile }
interface Kill { t: number; victim: number; victimTroop: number; attackers: number[]; attackerTroop: number }
interface Split { t: number; month: number; parent: number; daughter: number; onsetMonth: number; parentMales: number; sri: Record<string, number>; sriMedian: number }
interface YearRow { year: number; members: Record<number, number>; males: Record<number, number>; patrols: Record<number, number>; udOverlap: Record<string, number> }
export interface JobResult { seed: number; kind: string; days: number; kills: Kill[]; splits: Split[]; monthly: { month: number; troopId: number; Q: number; overlap: number; met: boolean }[];
  years: YearRow[]; alphaChanges: Record<number, number[]>; communityYearsByMales: Record<string, number>; fissionsByMales: Record<string, number>; wallS: number }

const maleClass = (m: number) => (m < 10 ? '<10' : m < 20 ? '10-19' : m <= 40 ? '20-40' : '>40');

/** Clones West's mother-offspring units and adult males until it holds >= members and >= males (fresh ids, mothers remapped). */
export function enlargeWest(world: World, members: number, males: number): void {
  const s = simOf(world);
  const west = () => world.chimps.filter(c => c.alive && c.troopId === 1);
  const adultMales = west().filter(isAdultMale), mothers = west().filter(c => c.sex === 'female' && c.age >= 12);
  const clone = (src: Chimp, dx: number): Chimp => {
    const c = structuredClone(src) as Chimp;
    c.id = s.nextChimpId++; c.name = `${src.name} ${c.id}`; c.position = [src.position[0] + dx, src.position[1], src.position[2] - 1];
    ix(c).tension = {}; c.bonds = { ...src.bonds, [src.id]: 0.6 };
    world.chimps.push(c);
    return c;
  };
  let k = 0;
  while (west().filter(isAdultMale).length < males && adultMales.length) clone(adultMales[k++ % adultMales.length], 2 + (k % 5));
  k = 0;
  while (west().length < members && mothers.length) {
    const m = mothers[k++ % mothers.length], mc = clone(m, 3 + (k % 7));
    for (const kid of world.chimps.filter(c => c.alive && c.motherId === m.id && c.age < 10)) { const kc = clone(kid, 3 + (k % 7)); kc.motherId = mc.id; }
  }
  markAliveChanged(world);
}

function udOverlap(world: World, a: number, b: number): number {
  const s = simOf(world), A = s.ud[a], B = s.ud[b];
  if (!A || !B) return NaN;
  const ta = A.reduce((x, y) => x + y, 0), tb = B.reduce((x, y) => x + y, 0);
  if (!ta || !tb) return NaN;
  let bc = 0;
  for (let i = 0; i < A.length; i++) if (A[i] > 0 && B[i] > 0) bc += Math.sqrt((A[i] / ta) * (B[i] / tb));
  return Math.round(bc * 1e4) / 1e4;
}

/** Adult-male SRI snapshot of a community from the association state (pairs of adult males; key "a-b"). */
function sriSnapshot(world: World, troop: number): { sri: Record<string, number>; median: number } {
  const f = simOf(world).fission, out: Record<string, number> = {}, v: number[] = [];
  if (!f) return { sri: out, median: NaN };
  const males = index(world).alive.filter(c => c.troopId === troop && isAdultMale(c)).map(c => c.id).sort((x, y) => x - y);
  for (let i = 0; i < males.length; i++) for (let j = i + 1; j < males.length; j++) {
    const x = f.pairs[males[i] * 100000 + males[j]] ?? 0, den = (f.scans[males[i]] ?? 0) + (f.scans[males[j]] ?? 0) - x;
    const r = den > 0 ? Math.round(x / den * 1e4) / 1e4 : 0;
    out[`${males[i]}-${males[j]}`] = r; v.push(r);
  }
  v.sort((x, y) => x - y);
  return { sri: out, median: v.length ? v[Math.floor(v.length / 2)] : NaN };
}

export function runJob(job: Job): JobResult {
  const t0 = Date.now();
  const params: Record<string, number> = job.kind === 'large-off' ? { fissionOn: 0, assocBondW: 0.3, popCap: 180 } : job.kind === 'large' ? { ...ON, popCap: 180 } : { ...ON };
  const world = createWorld(job.seed, { profile: job.profile, params });
  if (job.kind !== 'baseline') enlargeWest(world, 60, 15);
  const kills: Kill[] = [], splits: Split[] = [], monthly: JobResult['monthly'] = [], years: YearRow[] = [];
  const alphaChanges: Record<number, number[]> = {}, cyByMales: Record<string, number> = {}, fByMales: Record<string, number> = {};
  const snap: Record<number, { month: number; sri: Record<string, number>; median: number }> = {};
  let cursor = world.nextId - 1, lastMonth = Math.floor(world.time / MONTH_H), yearPatrols: Record<number, number> = {}, lastAlpha: Record<number, number> = {};
  const startT = world.time, end = startT + job.days * 24;
  let nextYear = startT + YEAR_H;
  const yearStart = () => { const m: Record<number, number> = {}, am: Record<number, number> = {}; for (const c of index(world).alive) { m[c.troopId] = (m[c.troopId] ?? 0) + 1; if (isAdultMale(c)) am[c.troopId] = (am[c.troopId] ?? 0) + 1; } return { m, am }; };
  let ys = yearStart();
  while (world.time < end) {
    const troopsBefore = world.troops.length;
    tickWorld(world);
    // new interactions: kills and patrols (by id cursor)
    const inter = world.interactions;
    for (let i = inter.length - 1; i >= 0 && inter[i].id > cursor; i--) {
      const it = inter[i];
      if (it.kind === 'kill') { const v = index(world).byId.get(it.targetId); kills.push({ t: world.time, victim: it.targetId, victimTroop: v?.troopId ?? -1, attackers: it.participants.filter(id => id !== it.targetId), attackerTroop: it.troopId }); }
      else if (it.kind === 'patrol') yearPatrols[it.troopId] = (yearPatrols[it.troopId] ?? 0) + 1;
    }
    if (inter.length) cursor = Math.max(cursor, inter[inter.length - 1].id);
    for (const t of world.troops) { if (t.alphaId !== (lastAlpha[t.id] ?? t.alphaId)) (alphaChanges[t.id] ??= []).push(world.time); lastAlpha[t.id] = t.alphaId; }
    // monthly detection rows (captured as they are written; the world keeps at most 240)
    const m = Math.floor(world.time / MONTH_H), f = simOf(world).fission;
    if (m !== lastMonth && f) {
      lastMonth = m;
      for (const r of f.log) if (r.month === m - 1 || r.month === m) if (!monthly.some(x => x.month === r.month && x.troopId === r.troopId)) {
        monthly.push({ month: r.month, troopId: r.troopId, Q: r.Q, overlap: r.overlap, met: r.met });
        const prev = monthly.filter(x => x.troopId === r.troopId && x.month < r.month).pop();
        if (r.met && (!prev || !prev.met)) { const s = sriSnapshot(world, r.troopId); snap[r.troopId] = { month: r.month, sri: s.sri, median: s.median }; }
      }
    }
    if (world.troops.length > troopsBefore && f) {
      const d = world.troops[world.troops.length - 1], parent = f.parents[d.id];
      const rows = monthly.filter(x => x.troopId === parent).sort((a, b) => a.month - b.month);
      let onset = rows.length ? rows[rows.length - 1].month : m;
      for (let i = rows.length - 1; i >= 0 && rows[i].met; i--) onset = rows[i].month;
      const sn = snap[parent] ?? { month: onset, ...sriSnapshot(world, parent) };
      splits.push({ t: world.time, month: m, parent, daughter: d.id, onsetMonth: onset, parentMales: ys.am[parent] ?? 0, sri: sn.sri, sriMedian: sn.median });
      fByMales[maleClass(ys.am[parent] ?? 0)] = (fByMales[maleClass(ys.am[parent] ?? 0)] ?? 0) + 1;
    }
    if (world.time >= nextYear) {
      nextYear += YEAR_H;
      const ov: Record<string, number> = {};
      for (const sp of splits) ov[`${sp.parent}-${sp.daughter}`] = udOverlap(world, sp.parent, sp.daughter);
      years.push({ year: years.length + 1, members: ys.m, males: ys.am, patrols: yearPatrols, udOverlap: ov });
      for (const n of Object.values(ys.am)) cyByMales[maleClass(n)] = (cyByMales[maleClass(n)] ?? 0) + 1;
      yearPatrols = {}; ys = yearStart();
    }
  }
  return { seed: job.seed, kind: job.kind, days: job.days, kills, splits, monthly, years, alphaChanges, communityYearsByMales: cyByMales, fissionsByMales: fByMales, wallS: Math.round((Date.now() - t0) / 1000) };
}

// ------------------------------------------------------------------------------------------------ scoring (pre-registered)

export function score(res: JobResult[]) {
  const by = (k: string) => res.filter(r => r.kind === k);
  // T-FIS-1: no fission below 10 adult males (baseline and large); <= 1 per 100 community-years at 20-40 males (large)
  const all = [...by('baseline'), ...by('large')];
  const cy = (c: string) => all.reduce((a, r) => a + (r.communityYearsByMales[c] ?? 0), 0), fs = (c: string) => all.reduce((a, r) => a + (r.fissionsByMales[c] ?? 0), 0);
  const fis1 = { small: { fissions: fs('<10'), communityYears: cy('<10') }, mid: { fissions: fs('20-40'), communityYears: cy('20-40') }, '10-19': { fissions: fs('10-19'), communityYears: cy('10-19') } };
  const fis1Pass = fis1.small.fissions === 0 && (fis1.mid.communityYears === 0 || fis1.mid.fissions / fis1.mid.communityYears <= 0.01);
  // T-FIS-2: years of strictly rising yearly mean Q before the onset year (per split); band 1-3
  const lead: number[] = [], upheaval: number[] = [];
  for (const r of by('large')) for (const sp of r.splits) {
    const q = new Map<number, number[]>();
    for (const row of r.monthly) if (row.troopId === sp.parent) { const y = Math.floor(row.month / 12); (q.get(y) ?? q.set(y, []).get(y)!).push(row.Q); }
    const onsetYear = Math.floor(sp.onsetMonth / 12), mean = (y: number) => { const v = q.get(y); return v ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
    let n = 0; for (let y = onsetYear; Number.isFinite(mean(y - 1)) && mean(y) > mean(y - 1); y--) n++;
    lead.push(n);
    const onT = sp.onsetMonth * MONTH_H;
    upheaval.push((r.alphaChanges[sp.parent] ?? []).some(t => Math.abs(t - onT) <= YEAR_H) ? 1 : 0);
  }
  // T-FIS-3: killings between daughters in the 7 years after the split / paired baseline intercommunity rate per pair-year
  const post: number[] = [], base: number[] = [];
  for (const r of by('large')) for (const sp of r.splits) {
    const win = Math.min(7 * YEAR_H, r.days * 24 - (sp.t - 0));
    const k = r.kills.filter(x => x.t > sp.t && x.t <= sp.t + 7 * YEAR_H && ((x.victimTroop === sp.parent && x.attackerTroop === sp.daughter) || (x.victimTroop === sp.daughter && x.attackerTroop === sp.parent))).length;
    if (win > 0) post.push(k / (win / YEAR_H));
  }
  for (const r of by('large-off')) { const pairs = 3, yrs = r.days / 365; base.push(r.kills.filter(x => x.victimTroop !== x.attackerTroop).length / (pairs * yrs)); }
  const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
  const fis3 = { postPerYear: mean(post), baselinePerPairYear: mean(base), ratio: mean(base) > 0 ? mean(post) / mean(base) : (mean(post) > 0 ? Infinity : NaN) };
  // T-FIS-4: share of victims killed by the other daughter whose killers include a former associate (SRI >= median)
  let vict = 0, former = 0;
  for (const r of by('large')) for (const sp of r.splits) for (const x of r.kills) {
    const across = (x.victimTroop === sp.parent && x.attackerTroop === sp.daughter) || (x.victimTroop === sp.daughter && x.attackerTroop === sp.parent);
    if (!across || x.t <= sp.t) continue;
    vict++;
    if (x.attackers.some(a => (sp.sri[`${Math.min(a, x.victim)}-${Math.max(a, x.victim)}`] ?? -1) >= sp.sriMedian)) former++;
  }
  // T-FIS-5: post-split patrols per 10 adult males, smaller daughter / larger daughter, median of yearly ratios
  const ratios: number[] = [];
  for (const r of by('large')) for (const sp of r.splits) for (const y of r.years) {
    if ((y.year - 1) * YEAR_H < sp.t) continue;
    const mp = y.males[sp.parent] ?? 0, md = y.males[sp.daughter] ?? 0;
    if (!mp || !md) continue;
    const [small, large] = md <= mp ? [sp.daughter, sp.parent] : [sp.parent, sp.daughter];
    const a = (y.patrols[small] ?? 0) / y.males[small] * 10, b = (y.patrols[large] ?? 0) / y.males[large] * 10;
    if (b > 0) ratios.push(a / b);
  }
  ratios.sort((a, b) => a - b);
  const fis5 = ratios.length ? ratios[Math.floor(ratios.length / 2)] : NaN;
  const splitsN = by('large').reduce((a, r) => a + r.splits.length, 0);
  return {
    'T-FIS-1': { ...fis1, pass: fis1Pass },
    'T-FIS-2': { splits: splitsN, leadYears: lead, median: lead.length ? [...lead].sort((a, b) => a - b)[Math.floor(lead.length / 2)] : null, band: [1, 3], upheavalWithinOneYear: upheaval },
    'T-FIS-3': { ...fis3, band: '>= 5' },
    'T-FIS-4': { victims: vict, formerAssociates: former, share: vict ? former / vict : null, pass: vict ? former / vict >= 0.5 : null },
    'T-FIS-5': { yearlyRatios: ratios.map(v => Math.round(v * 1e3) / 1e3), median: Number.isFinite(fis5) ? Math.round(fis5 * 1e3) / 1e3 : null, band: T_FIS5_BAND },
    rangeDivergence: { note: 'encoded by the split rule (overlap <= 0.5); reported, never counted', perSplit: by('large').flatMap(r => r.splits.map(sp => ({ seed: r.seed, byYear: r.years.map(y => y.udOverlap[`${sp.parent}-${sp.daughter}`]).filter(v => v !== undefined) }))) },
  };
}

async function main() {
  const args = process.argv.slice(2), flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const kinds = flag('kinds', 'baseline,large,large-off').split(',') as Job['kind'][], seeds = flag('seeds', '5303,5404,5505,5606,5707').split(',').map(Number);
  const days = args.includes('--days') ? +flag('days', '5') : 365 * +flag('years', '40'), profile = flag('profile', 'field') as Profile, out = flag('out', 'artifacts/validation/c9');
  mkdirSync(out, { recursive: true });
  const jobs: Job[] = kinds.flatMap(kind => seeds.map(seed => ({ seed, kind, days, profile })));
  const res = await runPool<Job, JobResult>(new URL(import.meta.url), jobs, { size: +flag('workers', '2'), onDone: (i, ms) => console.error(`${jobs[i].kind} seed ${jobs[i].seed}: ${(ms / 1000).toFixed(0)} s`) });
  for (const r of res) writeFileSync(`${out}/${r.kind}-seed${r.seed}.json`, JSON.stringify(r) + '\n');
  const sc = score(res);
  writeFileSync(`${out}/c9-summary.json`, JSON.stringify({ kinds, seeds, days, profile, score: sc }, null, 1) + '\n');
  const md = ['# C9 fission scenarios (simulation truth)', '', `Kinds ${kinds.join(', ')}; seeds ${seeds.join(', ')}; ${days} days; ${profile} profile. Rules: docs/realism-design.md "C9 pre-registration".`, '',
    ...Object.entries(sc).map(([k, v]) => `- **${k}**: ${JSON.stringify(v).slice(0, 600)}`), ''].join('\n');
  writeFileSync(`${out}/c9-summary.md`, md);
  console.log(md);
}

if (!isMainThread && parentPort) {
  parentPort.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: runJob(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) main();
