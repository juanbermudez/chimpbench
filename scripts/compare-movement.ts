// Real vs simulated movement (realism Stage C12, part b). Computes the same focal-follow movement statistics on Taï
// chimpanzee follows (P. t. verus, western subspecies, Côte d'Ivoire; NOT Kibale) and on MGOGO field-profile worlds
// followed the same way, and compares simulated community ranges with Taï territory sizes at matched group size.
//   Real: Lemoine S, Samuni L, Crockford C, Wittig RM (2023) Chimpanzees make tactical use of high elevation in
//   territorial contexts. PLOS Biol 21(11): e3002350, doi:10.1371/journal.pbio.3002350, S1–S3 Data, CC BY 4.0; and
//   Lemoine S, Boesch C, Preis A, Samuni L, Crockford C, Wittig RM (2020) Group dominance increases territory size and
//   reduces neighbour pressure in wild chimpanzees. R Soc Open Sci 7: 200577, doi:10.1098/rsos.200577, ESM, CC BY 4.0.
//
//   pnpm exec tsx scripts/compare-movement.ts                       # 5 seeds × 1 year after a 180-day burn-in, 2 workers
//   pnpm exec tsx scripts/compare-movement.ts --seeds 48,7,21,5,11 --years 1 --burn-in 180 --workers 2 [--reuse]
//
// Sampling mirror: every simulated community-day copies a random real group-day's follows (focal sex and the clock
// times of each record); the focal is a random adult (≥ 15 y, independent) of that sex; at each copied time the
// focal's position, activity (src/field/categories.ts mapped to rest / travel / feed) and party size are recorded.
// Outputs: artifacts/compare-movement/ (gitignored; real intermediates allowed) and docs/data/movement-compare.json
// (normalized maps and summary statistics only).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isMainThread, parentPort } from 'node:worker_threads';
import { CAT_AGONISTIC, CAT_FEED, CAT_NONE, CAT_TRAVEL, activityCategory } from '../src/field/categories';
import { PROFILES } from '../src/field/config';
import { sim as simX } from '../src/field/observer';
import { independent } from '../src/field/protocols';
import { meanNorm, normAffinity, normalizeUD, type NormGrid } from '../src/compare/normalize';
import { assertNonSensitive, C12_DEV_ROLE, distanceRow, scalarRow, scorecardMd, type ScoreRow } from '../src/compare/report';
import { MIN_SEEDS } from '../src/compare/score';
import { forestFigure, heatmapFigure, lineFigure, scatterFigure, REAL, SIM, type ForestRow, type Series } from '../src/compare/svg';
import { histogram, ks2, median, quantile } from '../src/compare/stats';
import { mulberry32 } from '../src/compare/sampling';
import { taiPoints, taiTerritories, type TaiPoint } from '../src/compare/tai';
import { FEED, REST, TRAVEL, activityShares, byFollow, followPaths, hourProfile, levelsOf, profileDistance, scaleMatchedBandwidth, steps, territory, travelShareIn, type Act, type Territory, type TrackPoint } from '../src/compare/tracks';
import { records, sharedStrings, sheetRows } from '../src/compare/xlsx';
import { createWorld, tickWorld } from '../src/simulation';
import { REGISTRY_HASH } from '../src/sim/params';
import { index } from '../src/sim/state';
import type { Chimp, World } from '../src/types';

type SimPoint = TrackPoint & { year: number };
interface GroupDay { follows: { sex: 'M' | 'F'; times: number[] }[] }
interface MoveJob { seed: number; years: number; burnInDays: number; templates: GroupDay[]; samplerSeed: number; partyLinkM: number; params?: Record<string, number> }
interface MoveResult { seed: number; points: SimPoint[]; sizes: { year: number; community: string; alive: number; independent: number }[]; wallMs: number }

const H_TAI = 149; // m, the Taï territory kernel bandwidth (plug-in), Lemoine et al. 2023 methods

/** Field activity of a simulated individual, as the Taï data code it: feed; travel (incl. agonistic displays and chases); rest (incl. grooming and other social). */
function actOf(w: World, c: Chimp, mates: Chimp[]): Act | -1 {
  const x = simX(c);
  if (!x || !c.alive) return -1;
  let groomed = false;
  if (c.action === 'rest' || c.action === 'shelter' || c.action === 'nest') groomed = mates.some(m => m.alive && m.action === 'groom' && m.targetId === c.id && (simX(m)?.phase ?? 0) >= 1);
  let atWater = false;
  if (c.action === 'drink') { const wt = index(w).waterById.get(c.targetId); atWater = !!wt && (c.position[0] - wt.position[0]) ** 2 + (c.position[2] - wt.position[2]) ** 2 <= 1.44; }
  const cat = activityCategory(c.action, x.phase, c.targetId, groomed, c.carryingMeat > 0.02, atWater);
  if (cat === CAT_NONE) return -1;
  return cat === CAT_FEED ? FEED : cat === CAT_TRAVEL || cat === CAT_AGONISTIC ? TRAVEL : REST;
}

/** Independent individuals in the focal's party: chain of community members each within `link` m of another (P-SCALE-1). */
function partySize(c: Chimp, mates: Chimp[], link: number): number {
  const l2 = link * link, inP = new Set<Chimp>([c]), q = [c];
  for (let h = 0; h < q.length; h++) for (const m of mates) if (!inP.has(m) && (m.position[0] - q[h].position[0]) ** 2 + (m.position[2] - q[h].position[2]) ** 2 <= l2) { inP.add(m); q.push(m); }
  let n = 0;
  for (const m of inP) if (independent(m)) n++;
  return n;
}

function runMoveJob(job: MoveJob): MoveResult {
  const t0 = performance.now();
  const w = createWorld(job.seed, { profile: 'field', params: job.params ?? {} });
  const startHour = w.hour, rng = mulberry32(job.samplerSeed ^ job.seed);
  const clock = () => startHour + w.time;
  const name = new Map(w.troops.map(t => [t.id, t.name.replace(/ community$/, '')]));
  while (Math.floor(clock() / 24) < job.burnInDays) tickWorld(w);
  const end = job.burnInDays + 365 * job.years, points: SimPoint[] = [], sizes: MoveResult['sizes'] = [];
  let curDay = -1;
  let active: { troop: number; focal: Chimp; times: number[]; ptr: number; follow: string; sex: 'M' | 'F'; year: number }[] = [];
  for (;;) {
    tickWorld(w);
    const T = clock(), day = Math.floor(T / 24), hr = T - day * 24;
    if (day >= end) break;
    if (day !== curDay) {
      curDay = day;
      active = [];
      const year = Math.floor((day - job.burnInDays) / 365);
      for (const t of [...w.troops].sort((a, b) => a.id - b.id)) {
        const mates = w.chimps.filter(c => c.alive && c.troopId === t.id);
        if ((day - job.burnInDays) % 365 === 0) sizes.push({ year, community: name.get(t.id)!, alive: mates.length, independent: mates.filter(independent).length });
        const tpl = job.templates[Math.floor(rng() * job.templates.length)], used = new Set<number>();
        tpl.follows.forEach((f, k) => {
          const pool = mates.filter(c => c.age >= 15 && independent(c) && (c.sex === 'male' ? 'M' : 'F') === f.sex && !used.has(c.id));
          if (!pool.length) return;
          const focal = pool[Math.floor(rng() * pool.length)];
          used.add(focal.id);
          active.push({ troop: t.id, focal, times: f.times, ptr: 0, follow: `${job.seed}:${t.id}:${day}:${k}`, sex: f.sex, year });
        });
      }
    }
    for (const a of active) {
      while (a.ptr < a.times.length && a.times[a.ptr] <= hr) {
        a.ptr++;
        const c = a.focal;
        if (!c.alive || c.troopId !== a.troop) { a.ptr = a.times.length; break; }
        const mates = w.chimps.filter(m => m.alive && m.troopId === a.troop), act = actOf(w, c, mates);
        if (act < 0) continue;
        points.push({ follow: a.follow, unit: `${job.seed}`, group: `${job.seed}:${name.get(a.troop)}`, sex: a.sex, t: hr, x: c.position[0], y: -c.position[2], act: act as Act, party: partySize(c, mates, job.partyLinkM), year: a.year });
      }
    }
  }
  return { seed: job.seed, points, sizes, wallMs: performance.now() - t0 };
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: MoveJob }) => {
    try { parentPort!.postMessage({ index: m.index, result: runMoveJob(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else {
  await main();
}

interface Stats {
  shares: [number, number, number]; profile: number[]; stepM: number[]; stepR: number[]; turn: number[];
  rate: number[]; straight: number[]; levels: number[]; zoneRatio: number; party: number[]; follows: number; records: number;
}

/** Every movement statistic for a set of points; r per group normalizes step lengths. */
function statsOf(points: TrackPoint[], levels: number[], rOf: (group: string) => number): Stats {
  const follows = byFollow(points), stepM: number[] = [], stepR: number[] = [], turn: number[] = [];
  for (const g of [...new Set(points.map(p => p.group))]) {
    const st = steps(follows.filter(f => f[0].group === g));
    stepM.push(...st.len); stepR.push(...st.len.map(v => v / rOf(g))); turn.push(...st.turn);
  }
  const paths = followPaths(follows);
  const core = travelShareIn(points, levels, -1, 0.5), edge = travelShareIn(points, levels, 0.75, 1);
  return { shares: activityShares(points), profile: hourProfile(points), stepM, stepR, turn, rate: paths.map(p => p.rate), straight: paths.map(p => p.straightness).filter(Number.isFinite),
    levels, zoneRatio: edge / core, party: points.map(p => p.party).filter(Number.isFinite), follows: follows.length, records: points.length };
}

function spearman(a: number[], b: number[]): number {
  const rank = (v: number[]) => { const idx = v.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]), r = new Array<number>(v.length); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2; i = j + 1; } return r; };
  const ra = rank(a), rb = rank(b), n = a.length, ma = ra.reduce((s, v) => s + v, 0) / n, mb = rb.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (ra[i] - ma) * (rb[i] - mb); saa += (ra[i] - ma) ** 2; sbb += (rb[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb);
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const has = (n: string) => args.includes(`--${n}`);
  const SEEDS = flag('seeds', '48,7,21,5,11').split(',').map(Number), YEARS = +flag('years', '1'), BURN = +flag('burn-in', '180');
  const WORKERS = +flag('workers', '2'), OUT = flag('out', 'artifacts/compare-movement'), GUIDE = flag('guide', 'docs/data/movement-compare.json'), SAMPLER_SEED = +flag('sampler-seed', '12'), PARAMS = JSON.parse(flag('params', '{}')) as Record<string, number>; // --params: registry overrides (baselines; the proof uses none)
  const root = new URL('../', import.meta.url), rel = (p: string) => new URL(p, root);
  mkdirSync(rel(`${OUT}/figures/`), { recursive: true });
  const t0 = performance.now();
  const xlsx = (file: string) => { const un = (p: string) => execFileSync('unzip', ['-p', rel(file).pathname, p], { maxBuffer: 1 << 28 }).toString('utf8'); return sheetRows(un('xl/worksheets/sheet1.xml'), sharedStrings(un('xl/sharedStrings.xml'))); };

  // ---------------------------------------------------------------- real ingest
  const { points: realPts, report: ingest } = taiPoints(records(xlsx('data/raw/plos-pbio-3002350/journal.pbio.3002350.s016.xlsx')));
  if (ingest.badActivity || ingest.durationMismatch) throw new Error(`Taï ingest checks failed: ${JSON.stringify(ingest)}`);
  const terrRows = taiTerritories(xlsx('data/raw/figshare-rsos200577/rsos200577_si_002.xlsx'));
  const s015 = records(xlsx('data/raw/plos-pbio-3002350/journal.pbio.3002350.s015.xlsx')).length, s017 = records(xlsx('data/raw/plos-pbio-3002350/journal.pbio.3002350.s017.xlsx')).length;
  console.error(`real: ${ingest.records} Taï records (${ingest.excludedOther} of class O excluded), ${ingest.follows} follows, ${ingest.groups.join('/')} ${ingest.dateRange.join('…')}; ${terrRows.length} territory group-years; s015 ${s015}, s017 ${s017} rows`);
  // templates: whole real group-days (their follows' focal sex and record times)
  const gd = new Map<string, Map<string, TaiPoint[]>>();
  for (const p of realPts) { const k = `${p.group}|${p.follow.slice(0, 10)}`; const m = gd.get(k) ?? gd.set(k, new Map()).get(k)!; (m.get(p.follow) ?? m.set(p.follow, []).get(p.follow)!).push(p); }
  const templates: GroupDay[] = [...gd.keys()].sort().map(k => ({ follows: [...gd.get(k)!.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, v]) => ({ sex: v[0].sex, times: v.map(p => p.t).sort((a, b) => a - b) })) }));

  // ---------------------------------------------------------------- provenance
  const hashFiles = (files: URL[]) => { const h = createHash('sha256'); for (const f of files) { h.update(f.pathname.split('/MGOGO/')[1] ?? f.pathname); h.update(readFileSync(f)); } return h.digest('hex').slice(0, 16); };
  const tsIn = (d: string) => readdirSync(rel(d)).filter(f => f.endsWith('.ts')).sort().map(f => rel(`${d}${f}`));
  const simCodeHash = hashFiles([...tsIn('src/sim/'), rel('src/simulation.ts'), rel('src/types.ts'), rel('data/params.json'), rel('src/field/categories.ts')]);
  const compareCodeHash = hashFiles([...tsIn('src/compare/'), new URL(import.meta.url)]);
  const templateHash = createHash('sha256').update(JSON.stringify(templates)).digest('hex').slice(0, 16);
  const partyLinkM = PROFILES.field.partyLinkM;
  const cacheKey = { simCodeHash, registry: REGISTRY_HASH as string, seeds: SEEDS, years: YEARS, burnInDays: BURN, samplerSeed: SAMPLER_SEED, templateHash, partyLinkM, params: PARAMS };

  // ---------------------------------------------------------------- simulated follows
  let sims: MoveResult[] = [];
  let simProv = { simCodeHash, registry: REGISTRY_HASH as string };
  const cacheFile = rel(`${OUT}/sim-follows.json`);
  const cached = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) as { key: typeof cacheKey; sims: MoveResult[] } : null;
  const same = (k: typeof cacheKey) => JSON.stringify({ ...k, simCodeHash: '', registry: '' }) === JSON.stringify({ ...cacheKey, simCodeHash: '', registry: '' });
  if (has('reuse') && cached && same(cached.key)) {
    sims = cached.sims; simProv = { simCodeHash: cached.key.simCodeHash, registry: cached.key.registry };
    console.error(cached.key.simCodeHash === simCodeHash ? 'sim: reusing cached follows' : `sim: WARNING reusing follows made by sim code ${cached.key.simCodeHash} (now ${simCodeHash}); re-run without --reuse to refresh`);
  } else {
    const { runPool } = await import('./lib/pool');
    const jobs: MoveJob[] = SEEDS.map(seed => ({ seed, years: YEARS, burnInDays: BURN, templates, samplerSeed: SAMPLER_SEED, partyLinkM, params: PARAMS }));
    console.error(`sim: ${jobs.length} field-profile worlds × (${BURN} burn-in days + ${YEARS} year(s)) on ${WORKERS} workers …`);
    sims = await runPool<MoveJob, MoveResult>(new URL(import.meta.url), jobs, { size: WORKERS, onDone: (i, ms) => console.error(`  seed ${jobs[i].seed} done in ${(ms / 60000).toFixed(1)} min`) });
    writeFileSync(cacheFile, JSON.stringify({ key: cacheKey, sims }));
  }

  // ---------------------------------------------------------------- territories and levels
  const realTerr = new Map<string, Territory>();
  for (const g of ingest.groups) realTerr.set(g, territory(realPts.filter(p => p.group === g), H_TAI));
  const k = median([...realTerr.values()].map(t => H_TAI / t.shape.r)); // Taï smoothing relative to territory size
  const realLv: number[] = realPts.map(p => levelsOf([p], realTerr.get(p.group)!)[0]);
  const kernelCheck = { spearman: spearman(realLv.map(v => v * 100), realPts.map(p => p.kernel)), medianAbsDiff: median(realLv.map((v, i) => Math.abs(v * 100 - realPts[i].kernel))) };
  const rReal = (g: string) => realTerr.get(g)!.shape.r;
  const units = [...new Set(realPts.map(p => p.unit))].sort().filter(u => new Set(realPts.filter(p => p.unit === u).map(p => p.follow)).size >= 100);
  const unitStats = units.map(u => { const idx = realPts.map((p, i) => (p.unit === u ? i : -1)).filter(i => i >= 0); return { unit: u, s: statsOf(idx.map(i => realPts[i]), idx.map(i => realLv[i]), rReal) }; });
  const realAll = statsOf(realPts, realLv, rReal);
  console.error(`real: territory h ${H_TAI} m → r East ${(rReal('East') / 1000).toFixed(2)} km, South ${(rReal('South') / 1000).toFixed(2)} km (h/r ${k.toFixed(3)}); recomputed kernel level vs the published column: Spearman ${kernelCheck.spearman.toFixed(3)}, median |Δ| ${kernelCheck.medianAbsDiff.toFixed(1)} points; units ${units.join(', ')}`);

  const simAn = sims.map(s => {
    const terr = new Map<string, Territory>();
    for (const g of [...new Set(s.points.map(p => p.group))].sort()) { const pts = s.points.filter(p => p.group === g); terr.set(g, territory(pts, scaleMatchedBandwidth(pts, k, 50, 4))); }
    const lv = s.points.map(p => levelsOf([p], terr.get(p.group)!)[0]);
    return { seed: s.seed, terr, stats: statsOf(s.points, lv, g => terr.get(g)!.shape.r), sizes: s.sizes };
  });
  const nSeeds = simAn.length;

  // ---------------------------------------------------------------- scorecard (rules in src/compare/score.ts)
  const rows: ScoreRow[] = [];
  const unitMed = (f: (s: Stats) => number[]) => unitStats.map(u => median(f(u.s))), seedMed = (f: (s: Stats) => number[]) => simAn.map(s => median(f(s.stats)));
  const unitVal = (f: (s: Stats) => number) => unitStats.map(u => f(u.s)), seedVal = (f: (s: Stats) => number) => simAn.map(s => f(s.stats));
  const nSim = simAn.reduce((a, s) => a + s.stats.records, 0);
  const shareRow = (i: 0 | 1 | 2, id: string, label: string) => { const r = scalarRow(id, label, 'fraction', 'record', 'difference', unitVal(s => s.shares[i]), unitVal(s => s.shares[i]), seedVal(s => s.shares[i]), nSim, '', realAll.shares[i]); r.real.value = realAll.shares[i]; r.dist = r.sim.value - r.real.value; rows.push(r); };
  shareRow(1, 'travel', 'Travel share of follow records'); shareRow(0, 'rest', 'Rest share of follow records (incl. grooming, social)'); shareRow(2, 'feed', 'Feed share of follow records');
  {
    const simPooled = hourProfile(sims.flatMap(s => s.points)), d = profileDistance(simPooled, realAll.profile);
    const base = unitStats.map(u => profileDistance(u.s.profile, hourProfile(realPts.filter(p => p.unit !== u.unit))));
    rows.push(distanceRow('profile', 'Time-of-day travel profile (07–18 h)', 'mean |Δ| share', 'hour', 'mean |Δ|', d, simAn.map(s => profileDistance(s.stats.profile, realAll.profile)), base,
      { value: NaN, lo: NaN, hi: NaN, spreadOf: 'hourly travel shares', n: realAll.records }, { value: NaN, lo: NaN, hi: NaN, seeds: [], n: nSim }, nSeeds, 'Distance: mean absolute difference of hourly travel shares; baseline: each real group-year against the other group-years.'));
  }
  rows.push(scalarRow('stepM', '30-min step length', 'm', 'step', 'ratio', realAll.stepM, unitMed(s => s.stepM), seedMed(s => s.stepM), simAn.reduce((a, s) => a + s.stats.stepM.length, 0), 'Straight-line distance between records 30 min apart (10 m bins in the real data).'));
  const distRow = (id: string, label: string, unit: string, get: (s: Stats) => number[], note: string) => {
    const realV = get(realAll), simV = simAn.flatMap(s => get(s.stats));
    const base = unitStats.map(u => ks2(get(u.s), unitStats.filter(v => v !== u).flatMap(v => get(v.s))));
    rows.push(distanceRow(id, label, unit, 'record', 'KS D', ks2(simV, realV), simAn.map(s => ks2(get(s.stats), realV)), base,
      { value: median(realV), lo: quantile(realV, 0.1), hi: quantile(realV, 0.9), spreadOf: '10th–90th percentile', n: realV.length },
      { value: median(simV), lo: quantile(simV, 0.1), hi: quantile(simV, 0.9), seeds: simAn.map(s => median(get(s.stats))), n: simV.length }, nSeeds, `${note} Baseline: largest KS D of one real group-year against the others.`));
  };
  distRow('stepR', '30-min step length in territory radii', 'r', s => s.stepR, 'r = equal-area radius of the group’s 95% territory kernel.');
  distRow('turn', 'Turning angle between 30-min steps', 'radians', s => s.turn, 'Steps ≥ 15 m only (below that the 10 m bins carry no heading).');
  rows.push(scalarRow('pathRate', 'Path per hour over full-day follows (sum of 30-min steps)', 'm/h', 'follow', 'ratio', realAll.rate, unitMed(s => s.rate), seedMed(s => s.rate), simAn.reduce((a, s) => a + s.stats.rate.length, 0), 'Follows ≥ 8 h with no gap > 1 h; a lower bound of the true path (straight lines between 30-min records).'));
  rows.push(scalarRow('straight', 'Straightness of full-day follows (net ÷ path)', 'fraction', 'follow', 'difference', realAll.straight, unitMed(s => s.straight), seedMed(s => s.straight), simAn.reduce((a, s) => a + s.stats.straight.length, 0)));
  distRow('levels', 'Position in own territory (kernel level of records)', 'level 0–1', s => s.levels, 'Near-uniform by construction (the kernel is built from the same records); deviations reflect smoothing and clumping.');
  { const r = scalarRow('zone', 'Travel share at the periphery (> 75% level) ÷ in the core (≤ 50%)', 'ratio', 'record', 'ratio', unitVal(s => s.zoneRatio), unitVal(s => s.zoneRatio), seedVal(s => s.zoneRatio), nSim, 'Taï chimpanzees travel more at the periphery (Lemoine et al. 2023).'); r.real.value = realAll.zoneRatio; r.dist = r.sim.value / r.real.value; rows.push(r); }
  rows.push(scalarRow('party', 'Party size (independent individuals)', 'individuals', 'record', 'ratio', realAll.party, unitMed(s => s.party), seedMed(s => s.party), nSim, 'Real: independents within visibility (Taï); sim: independents in the focal’s 50 m chain party (P-SCALE-1). Taï East and South held ~23–27 members in 2014–16; sim communities 12–22.'));
  // territory size at matched group size (RSOS ESM 2)
  const simSizes = simAn.flatMap(s => s.sizes.map(z => z.alive)), sizeLo = Math.min(...simSizes), sizeHi = Math.max(...simSizes);
  const matched = terrRows.filter(r => r.groupSize >= sizeLo && r.groupSize <= sizeHi);
  const simArea = simAn.map(s => median([...s.terr.values()].map(t => t.shape.area95 / 1e6)));
  { const r = scalarRow('territory', `Territory 95% kernel area at matched group size (${sizeLo}–${sizeHi} members)`, 'km²', 'group-year', 'ratio', matched.map(m => m.territoryKm2), matched.map(m => m.territoryKm2), simArea, simAn.reduce((a, s) => a + s.terr.size, 0),
      `Real: Taï group-years with that group size (${[...new Set(matched.map(m => m.group))].join(', ')}; n = ${matched.length}), yearly kernels (Lemoine et al. 2020). Sim: 95% kernel of each community's follow records over the sampled period, bandwidth at the Taï h/r.`); r.real.spreadOf = 'matched group-years'; rows.push(r); }
  // normalized territory shape
  const realMaps = ingest.groups.map(g => { const t = realTerr.get(g)!; return normalizeUD(t.ud, t.grid, t.shape); });
  const simMaps = simAn.flatMap(s => [...s.terr.values()].map(t => normalizeUD(t.ud, t.grid, t.shape)));
  const realMap = meanNorm(realMaps), simMap = simMaps.length ? meanNorm(simMaps) : null;
  rows.push(distanceRow('map', 'Normalized territory map (mean)', 'map', 'shape', '1 − BA', simMap ? 1 - normAffinity(realMap, simMap) : NaN, simAn.map(s => 1 - normAffinity(realMap, meanNorm([...s.terr.values()].map(t => normalizeUD(t.ud, t.grid, t.shape))))),
    realMaps.map((m, i) => 1 - normAffinity(m, meanNorm(realMaps.filter((_, j) => j !== i)))), { value: NaN, lo: NaN, hi: NaN, spreadOf: '', n: realMaps.length }, { value: NaN, lo: NaN, hi: NaN, seeds: [], n: simMaps.length }, nSeeds, 'Baseline: East vs South.'));
  rows.push({ id: 'hills', label: 'Use of hills near borders (S1 Data)', unit: '—', level: 'event', distance: 'none', real: { value: NaN, lo: NaN, hi: NaN, spreadOf: '', n: s015 }, sim: { value: NaN, lo: NaN, hi: NaN, seeds: [], n: 0 }, dist: NaN, verdict: 'not comparable', note: 'The simulation has no terrain elevation.' });
  rows.push({ id: 'advance', label: 'Advance vs retreat at border stops (S3 Data)', unit: '—', level: 'event', distance: 'none', real: { value: NaN, lo: NaN, hi: NaN, spreadOf: '', n: s017 }, sim: { value: NaN, lo: NaN, hi: NaN, seeds: [], n: 0 }, dist: NaN, verdict: 'not comparable', note: 'Scored as T-BRD-1 by the field observer (scripts/field-metrics.ts; 1-min halts in the outer band of the own range, band from these S3 Data by scripts/patrol-bands-metrics.ts); these 30-min follow copies cannot resolve halts.' });

  // ---------------------------------------------------------------- outputs
  const r4 = (v: number) => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : null);
  const bins = 40;
  const dens = (get: (s: Stats) => number[], lo: number, hi: number) => {
    const per = simAn.map(s => histogram(get(s.stats), lo, hi, bins).density), units = unitStats.map(u => histogram(get(u.s), lo, hi, bins).density);
    return { lo, hi, bins, real: histogram(get(realAll), lo, hi, bins).density.map(r4), realBand: units.length ? { lo: units[0].map((_, i) => r4(Math.min(...units.map(p => p[i])))), hi: units[0].map((_, i) => r4(Math.max(...units.map(p => p[i])))) } : null,
      sim: simAn.length ? histogram(simAn.flatMap(s => get(s.stats)), lo, hi, bins).density.map(r4) : null, simBand: per.length ? { lo: per[0].map((_, i) => r4(Math.min(...per.map(p => p[i])))), hi: per[0].map((_, i) => r4(Math.max(...per.map(p => p[i])))) } : null };
  };
  const zoneCurve = (pts: TrackPoint[], lv: number[]) => Array.from({ length: 10 }, (_, i) => r4(travelShareIn(pts, lv, i / 10 - (i === 0 ? 1 : 0), (i + 1) / 10)));
  const simLvAll = simAn.flatMap(s => s.stats.levels), simPtsAll = sims.flatMap(s => s.points);
  const profileOut = { hours: Array.from({ length: 11 }, (_, i) => 7 + i), real: realAll.profile.map(r4), realUnits: unitStats.map(u => ({ unit: u.unit, profile: u.s.profile.map(r4) })), sim: simAn.length ? hourProfile(simPtsAll).map(r4) : null, simSeeds: simAn.map(s => s.stats.profile.map(r4)) };
  const attribution = 'Real data: Lemoine S, Samuni L, Crockford C, Wittig RM (2023) Chimpanzees make tactical use of high elevation in territorial contexts. PLOS Biology 21(11): e3002350, doi:10.1371/journal.pbio.3002350, S1–S3 Data, CC BY 4.0; Lemoine S, Boesch C, Preis A, Samuni L, Crockford C, Wittig RM (2020) Group dominance increases territory size and reduces neighbour pressure in wild chimpanzees. Royal Society Open Science 7: 200577, doi:10.1098/rsos.200577, ESM, CC BY 4.0. Taï National Park, Côte d’Ivoire: western chimpanzees (P. t. verus), not Kibale. Derived statistics and normalized maps by MGOGO; not endorsed by the authors.';
  const verdictRules = 'Scalar: similar if the sim median lies inside the range of real group-year values; different if no seed does; otherwise inconclusive. Distribution / profile / map: distance ≤ the largest real leave-one-group-year-out distance is similar, > 2× it is different, otherwise inconclusive. Fewer than 5 seeds: inconclusive.';
  const caveats = [
    'Different subspecies and forest: Taï (P. t. verus, lowland rainforest, Côte d’Ivoire), not Kibale (P. t. schweinfurthii). The simulation is parameterized for Kibale, so Taï is a reference for movement structure, not a target.',
    `Taï records are 30-min points of focal follows; simulated follows copy whole real group-days (focal sex and record times), so sampling intervals, gaps and time-of-day coverage match by construction. Class "O" follows (${ingest.excludedOther} records) are excluded.`,
    'Activity mapping (design assumption): Taï codes only rest / travel / feed; simulated grooming and other social actions count as rest, agonistic actions as travel, via the field observer categories (src/field/categories.ts).',
    'Party size definitions differ (Taï: independents within visibility; sim: 50 m chain party).',
    `Territory kernels: Taï used h = 149 m (plug-in) on all GPS tracks; here real kernels use h = 149 m on the 30-min records (recomputed level vs published: Spearman ${kernelCheck.spearman.toFixed(2)}), and simulated kernels use the same h/r ratio (${k.toFixed(3)}).`,
    `Sim: ${YEARS} year(s) per seed after a ${BURN}-day burn-in; results hold for the sim code hash recorded in provenance (stage C6 is changing ranging).`,
  ];
  const provenance = { generated: new Date().toISOString(), script: 'scripts/compare-movement.ts', compareCodeHash,
    sim: { profile: 'field', params: JSON.stringify(PARAMS), registry: simProv.registry, simCodeHash: simProv.simCodeHash, currentSimCodeHash: simCodeHash, seeds: SEEDS, yearsSampled: YEARS, burnInDays: BURN, samplerSeed: SAMPLER_SEED, partyLinkM,
      follows: simAn.map(s => ({ seed: s.seed, follows: s.stats.follows, records: s.stats.records })), bandwidthOverR: r4(k), communitySizes: simAn.flatMap(s => s.sizes.map(z => ({ seed: s.seed, ...z }))),
      runsReduced: SEEDS.length < MIN_SEEDS ? `only ${SEEDS.length} seeds: verdicts are inconclusive by rule` : null },
    real: { records: ingest.records, follows: ingest.follows, excludedOther: ingest.excludedOther, groups: ingest.groups, dateRange: ingest.dateRange, units, kernelCheck: { spearman: r4(kernelCheck.spearman), medianAbsDiff: r4(kernelCheck.medianAbsDiff) },
      territoryRadiusKm: Object.fromEntries(ingest.groups.map(g => [g, r4(rReal(g) / 1000)])), territoryAreaKm2: Object.fromEntries(ingest.groups.map(g => [g, r4(realTerr.get(g)!.shape.area95 / 1e6)])),
      publishedTerritoryKm2: Object.fromEntries(ingest.groups.map(g => [g, terrRows.filter(r => r.group === g[0] && r.year >= 2014).map(r => ({ year: r.year, km2: r4(r.territoryKm2) }))])) } };
  const guide = {
    title: 'Real vs simulated movement (Taï follows)', role: C12_DEV_ROLE, attribution, provenance, verdictRules, caveats,
    privacy: 'No coordinates or identities: step lengths, angles, rates, shares and normalized maps only. Taï territory sizes are the published group-year aggregates.',
    scorecard: rows.map(r => ({ ...r, real: { ...r.real, value: r4(r.real.value), lo: r4(r.real.lo), hi: r4(r.real.hi), preFission: r.real.preFission === undefined ? undefined : r4(r.real.preFission) }, sim: { ...r.sim, value: r4(r.sim.value), lo: r4(r.sim.lo), hi: r4(r.sim.hi), seeds: r.sim.seeds.map(r4) }, dist: r4(r.dist), distSeeds: r.distSeeds?.map(r4), baseline: r.baseline === undefined ? undefined : r4(r.baseline) })),
    profile: profileOut,
    distributions: { stepR: dens(s => s.stepR, 0, 0.4), stepM: dens(s => s.stepM, 0, 800), turn: dens(s => s.turn, 0, Math.PI), levels: dens(s => s.levels, 0, 1) },
    travelByLevel: { edges: Array.from({ length: 11 }, (_, i) => i / 10), real: zoneCurve(realPts, realLv), sim: simAn.length ? zoneCurve(simPtsAll, simLvAll) : null },
    territories: { tai: terrRows.map(r => ({ group: r.group, year: r.year, groupSize: r4(r.groupSize), territoryKm2: r4(r.territoryKm2), obsHours: Math.round(r.obsHours) })), sim: simAn.flatMap(s => [...s.terr.entries()].map(([g, t]) => ({ seed: s.seed, community: g.split(':')[1], alive: s.sizes.find(z => z.community === g.split(':')[1])?.alive ?? null, areaKm2: r4(t.shape.area95 / 1e6) }))) },
    maps: { real: { n: realMap.n, half: realMap.half, d: Array.from(realMap.d, v => Math.round(v * 1e4) / 1e4) }, sim: simMap ? { n: simMap.n, half: simMap.half, d: Array.from(simMap.d, v => Math.round(v * 1e4) / 1e4) } : null },
  };
  const focalCodes = new Set(realPts.map(p => p.follow.split('_')[2]).filter(Boolean));
  assertNonSensitive(guide, focalCodes, ['obsHours', 'records', 'follows']);
  mkdirSync(dirname(rel(GUIDE).pathname), { recursive: true });
  writeFileSync(rel(GUIDE), JSON.stringify(guide) + '\n');
  const header = [`Real: Taï East and South groups (P. t. verus), ${ingest.dateRange.join(' to ')}, ${ingest.follows} focal follows. Sim: field profile, seeds ${SEEDS.join(', ')}, ${YEARS} sampled year(s) after a ${BURN}-day burn-in; registry ${simProv.registry}, sim code ${simProv.simCodeHash}.`];
  const md = scorecardMd('Real (Taï) vs simulated movement: similarity scorecard', [`Role: ${C12_DEV_ROLE}.`, ...header], rows, attribution, verdictRules, 'Real pooled', caveats);
  writeFileSync(rel(`${OUT}/scorecard.md`), md);
  writeFileSync(rel(`${OUT}/result.json`), JSON.stringify({ ...guide, units: unitStats.map(u => ({ unit: u.unit, follows: u.s.follows, records: u.s.records, shares: u.s.shares, stepMedian: median(u.s.stepM), rate: median(u.s.rate), zoneRatio: u.s.zoneRatio })) }, null, 1));

  // ---------------------------------------------------------------- figures
  const dir = rel(`${OUT}/figures/`), src = 'Real: Taï East and South, 2013–2016 (Lemoine et al. 2023, PLOS Biol, CC BY 4.0), western chimpanzees, not Kibale. Sim: MGOGO field profile.';
  const dser = (d: ReturnType<typeof dens>): Series[] => {
    const w = (d.hi - d.lo) / d.bins, xs = d.real.map((_, i) => d.lo + (i + 0.5) * w);
    const s: Series[] = [{ name: 'Taï (band: group-years)', color: REAL, x: xs, y: d.real.map(v => v ?? NaN), lo: d.realBand?.lo.map(v => v ?? NaN), hi: d.realBand?.hi.map(v => v ?? NaN) }];
    if (d.sim) s.push({ name: 'Simulated (band: seeds)', color: SIM, x: xs, y: d.sim.map(v => v ?? NaN), lo: d.simBand?.lo.map(v => v ?? NaN), hi: d.simBand?.hi.map(v => v ?? NaN) });
    return s;
  };
  const hrs = profileOut.hours.map(h => h + 0.5);
  const prof: Series[] = [{ name: 'Taï (band: group-years)', color: REAL, x: hrs, y: realAll.profile, lo: hrs.map((_, i) => Math.min(...unitStats.map(u => u.s.profile[i]).filter(Number.isFinite))), hi: hrs.map((_, i) => Math.max(...unitStats.map(u => u.s.profile[i]).filter(Number.isFinite))) }];
  if (simAn.length) prof.push({ name: 'Simulated (band: seeds)', color: SIM, x: hrs, y: hourProfile(simPtsAll), lo: hrs.map((_, i) => Math.min(...simAn.map(s => s.stats.profile[i]).filter(Number.isFinite))), hi: hrs.map((_, i) => Math.max(...simAn.map(s => s.stats.profile[i]).filter(Number.isFinite))) });
  const lvX = Array.from({ length: 10 }, (_, i) => i / 10 + 0.05);
  const zone: Series[] = [{ name: 'Taï', color: REAL, x: lvX, y: guide.travelByLevel.real.map(v => v ?? NaN) }];
  if (guide.travelByLevel.sim) zone.push({ name: 'Simulated', color: SIM, x: lvX, y: guide.travelByLevel.sim.map(v => v ?? NaN) });
  writeFileSync(new URL('movement-activity.svg', dir), lineFigure('When and where chimpanzees travel', src, [
    { name: 'Travel share by hour of day', xLabel: 'clock hour', yLabel: 'share of records travelling', series: prof, xRange: [7, 18], xTicks: [7, 9, 11, 13, 15, 17], yRange: [0, 0.6] },
    { name: 'Travel share by position in the territory', xLabel: 'kernel level of the record (0 core … 1 edge)', yLabel: 'share of records travelling', series: zone, xRange: [0, 1], xTicks: [0, 0.25, 0.5, 0.75, 1], yRange: [0, 0.6] }]));
  const D = guide.distributions;
  writeFileSync(new URL('movement-steps.svg', dir), lineFigure('Movement at the 30-min record interval', src, [
    { name: 'Step length (metres)', xLabel: 'metres per 30 min', yLabel: 'density', series: dser(D.stepM), xRange: [0, 800], xTicks: [0, 200, 400, 600, 800] },
    { name: 'Step length (territory radii)', xLabel: 'r per 30 min', yLabel: 'density', series: dser(D.stepR), xRange: [0, 0.4], xTicks: [0, 0.1, 0.2, 0.3, 0.4] },
    { name: 'Turning angle', xLabel: 'radians (0 straight on, π reversal)', yLabel: 'density', series: dser(D.turn), xRange: [0, Math.PI], xTicks: [0, 1, 2, 3] }]));
  writeFileSync(new URL('movement-territory.svg', dir), heatmapFigure('Territories, normalized (Taï vs simulated)', `Group territory kernels from follow records, centred, scaled by territory radius and rotated. ${src}`,
    [{ name: 'Taï (East, South)', grid: realMap, color: REAL }, ...(simMap ? [{ name: 'Simulated', grid: simMap as NormGrid, color: SIM }] : [])]));
  const byG = new Map<string, { x: number; y: number; label: string }[]>();
  for (const r of terrRows) (byG.get(r.group) ?? byG.set(r.group, []).get(r.group)!).push({ x: r.groupSize, y: r.territoryKm2, label: `${r.year}` });
  const taiNames: Record<string, string> = { E: 'East', M: 'Middle', N: 'North', S: 'South' };
  writeFileSync(new URL('territory-size.svg', dir), scatterFigure('Territory size vs group size', 'Taï yearly 95% kernel territories 1997–2016 (Lemoine et al. 2020, R Soc Open Sci, CC BY 4.0) and simulated communities (95% kernel of follow records over the sampled year).',
    'group size (members)', 'territory (km²)', [{ name: 'Taï group-years', color: REAL, pts: [...byG.entries()].flatMap(([g, p]) => p.map(q => ({ ...q, label: `${taiNames[g] ?? g} ${q.label}` }))) },
      { name: 'Simulated communities', color: SIM, pts: guide.territories.sim.filter(s => s.alive !== null && s.areaKm2 !== null).map(s => ({ x: s.alive!, y: s.areaKm2!, label: `seed ${s.seed} ${s.community}` })) }],
    ['Taï groups: East, Middle, North, South (western chimpanzees). Kernel methods differ between the two sources (see caveats).']));
  const forest: ForestRow[] = rows.filter(r => (r.distance === 'ratio' || r.distance === 'difference') && r.real.value > 0 && r.sim.lo > 0 && r.real.lo > 0)
    .map(r => ({ label: r.label.replace(/ \(.*\)$/, ''), ratio: r.sim.value / r.real.value, lo: r.sim.lo / r.real.value, hi: r.sim.hi / r.real.value, realLo: r.real.lo / r.real.value, realHi: r.real.hi / r.real.value, verdict: r.verdict }));
  if (forest.length) writeFileSync(new URL('movement-scorecard.svg', dir), forestFigure('Simulated ÷ Taï, by statistic', src, forest));
  console.error(`done in ${((performance.now() - t0) / 1000).toFixed(0)} s → ${GUIDE}, ${OUT}/`);
  console.log(md);
}
