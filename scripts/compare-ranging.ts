// Real vs simulated home ranges (realism Stage C12, part a). Computes the same kernel home-range statistics on the
// Ngogo GPS subsample (Sandel et al., Zenodo 10.5281/zenodo.18603419, CC BY 4.0; supplement to Science
// doi:10.1126/science.adz4944) and on MGOGO field-profile worlds sampled the same way, then writes a similarity
// scorecard, normalized overlay figures and a non-sensitive summary for the guide.
//
//   pnpm exec tsx scripts/compare-ranging.ts                          # 5 seeds × 2 years after a 180-day burn-in, 2 workers
//   pnpm exec tsx scripts/compare-ranging.ts --seeds 48,7,21,5,11 --years 2 --burn-in 180 --workers 2
//   pnpm exec tsx scripts/compare-ranging.ts --reuse                  # re-analyse cached sim fixes when the sim code is unchanged
//   pnpm exec tsx scripts/compare-ranging.ts --real-only              # real statistics only
//
// Outputs: artifacts/compare/ (may hold real-coordinate intermediates; gitignored): real-indyears.json,
// sim-fixes.json (cache), result.json, scorecard.md, figures/*.svg. docs/data/ranging-compare.json: only normalized,
// rotated, coarse maps and summary statistics (no coordinates, no names).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isMainThread, parentPort } from 'node:worker_threads';
import { parseClusterCsv, parseGpsCsv, toFixes } from '../src/compare/ingest';
import { NORM_HALF, NORM_N, meanNorm, normAffinity, normMass, type NormGrid } from '../src/compare/normalize';
import { analyseYear, byYear, fixedBandwidth, pooledOverlap, yearToYear, type YearAnalysis, type YearPair } from '../src/compare/ranging';
import { checkSampling, monthOfDoy, mulberry32, qualify, schedulesOf, simDayOf, simDoy, type Fix, type Schedule } from '../src/compare/sampling';
import { MIN_SEEDS, distanceVerdict } from '../src/compare/score';
import { assertNonSensitive, C12_DEV_ROLE, scalarRow as mkScalar, scorecardMd, type ScoreRow } from '../src/compare/report';
import { heatmapFigure, forestFigure, lineFigure, REAL, SIM, INK2, type ForestRow, type Series } from '../src/compare/svg';
import { histogram, ks2, median, quantile } from '../src/compare/stats';
import { createWorld, tickWorld } from '../src/simulation';
import { REGISTRY_HASH } from '../src/sim/params';

type SimFix = Fix & { community: string };
interface SimJob { seed: number; years: number; burnInDays: number; params?: Record<string, number>; minAge: { M: number; F: number }; schedules: { M: Schedule[]; F: Schedule[] }; samplerSeed: number }
interface SimResult { seed: number; fixes: SimFix[]; sizes: { year: number; community: string; alive: number; mature: number }[]; wallMs: number; params: unknown }

const SLOT_MIN = 15, SLOT0 = (8 * 60) / SLOT_MIN, SLOTS = (10 * 60) / SLOT_MIN; // 15-min fixes between 08:00 and 17:59

/** One field-profile world: burn-in, then per year record every mature individual's 15-min positions in 08:00–17:59
 *  and sample them with real schedules (whole real individual-years, same sex, drawn with the job's own RNG). */
function runSimJob(job: SimJob): SimResult {
  const t0 = performance.now();
  const w = createWorld(job.seed, { profile: 'field', params: job.params ?? {} });
  const startHour = w.hour, startDoy = w.environment.dayOfYear, rng = mulberry32(job.samplerSeed ^ job.seed);
  const clockDay = () => Math.floor((startHour + w.time) / 24);
  const clockMin = () => { const t = startHour + w.time; return (t - Math.floor(t / 24) * 24) * 60; };
  const troopName = new Map(w.troops.map(t => [t.id, t.name.replace(/ community$/, '')]));
  while (clockDay() < job.burnInDays) tickWorld(w);
  const fixes: SimFix[] = [], sizes: SimResult['sizes'] = [];
  for (let k = 0; k < job.years; k++) {
    const yearStart = job.burnInDays + 365 * k;
    for (const t of w.troops) {
      const alive = w.chimps.filter(c => c.alive && c.troopId === t.id);
      sizes.push({ year: k, community: troopName.get(t.id)!, alive: alive.length, mature: alive.filter(c => c.age >= job.minAge[c.sex === 'male' ? 'M' : 'F']).length });
    }
    const rec = new Map<number, { sex: 'M' | 'F'; pos: Float32Array; troop: Int16Array }>();
    let lastKey = -1;
    while (clockDay() < yearStart + 365) {
      tickWorld(w);
      const day = clockDay(), slot = Math.floor(clockMin() / SLOT_MIN) - SLOT0, key = day * 100 + slot;
      if (slot < 0 || slot >= SLOTS || key === lastKey || day < yearStart) continue;
      lastKey = key;
      const idx = (day - yearStart) * SLOTS + slot;
      for (const c of w.chimps) {
        const sex = c.sex === 'male' ? 'M' : 'F';
        if (!c.alive || c.age < job.minAge[sex]) continue;
        let r = rec.get(c.id);
        if (!r) { r = { sex, pos: new Float32Array(365 * SLOTS * 2).fill(NaN), troop: new Int16Array(365 * SLOTS).fill(-1) }; rec.set(c.id, r); }
        r.pos[2 * idx] = c.position[0]; r.pos[2 * idx + 1] = -c.position[2]; // x east, y north (−z)
        r.troop[idx] = c.troopId;
      }
    }
    for (const id of [...rec.keys()].sort((a, b) => a - b)) {
      const r = rec.get(id)!, pool = job.schedules[r.sex], s = pool[Math.floor(rng() * pool.length)];
      const got: SimFix[] = [];
      for (let i = 0; i < s.doy.length; i++) {
        const day = simDayOf(s.doy[i], yearStart, startDoy), slot = Math.floor(s.min[i] / SLOT_MIN) - SLOT0;
        if (slot < 0 || slot >= SLOTS) continue;
        const idx = (day - yearStart) * SLOTS + slot, x = r.pos[2 * idx];
        if (Number.isNaN(x)) continue;
        const doy = simDoy(day, startDoy);
        got.push({ ind: `${job.seed}:${id}`, sex: r.sex, year: k, month: monthOfDoy(doy), doy, day, min: s.min[i], x, y: r.pos[2 * idx + 1], community: troopName.get(r.troop[idx]) ?? '?' });
      }
      // an individual-year belongs to the community where most of its fixes fall (females transfer)
      const count = new Map<string, number>();
      for (const f of got) count.set(f.community, (count.get(f.community) ?? 0) + 1);
      const home = [...count.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
      fixes.push(...got.filter(f => f.community === home));
    }
  }
  return { seed: job.seed, fixes, sizes, wallMs: performance.now() - t0, params: (w as unknown as { sim: { params: unknown } }).sim.params };
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: SimJob }) => {
    try { parentPort!.postMessage({ index: m.index, result: runSimJob(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else {
  await main();
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const has = (n: string) => args.includes(`--${n}`);
  const SEEDS = flag('seeds', '48,7,21,5,11').split(',').map(Number), YEARS = +flag('years', '2'), BURN = +flag('burn-in', '180');
  const WORKERS = +flag('workers', '2'), OUT = flag('out', 'artifacts/compare'), GUIDE = flag('guide', 'docs/data/ranging-compare.json');
  const SAMPLER_SEED = +flag('sampler-seed', '12'), PARAMS = JSON.parse(flag('params', '{}')) as Record<string, number>; // --params: registry overrides (baselines; the proof uses none)
  const root = new URL('../', import.meta.url);
  const rel = (p: string) => new URL(p, root);
  mkdirSync(rel(`${OUT}/figures/`), { recursive: true });
  const t0 = performance.now();

  // ---------------------------------------------------------------- real ingest
  const ARCH = 'data/raw/zenodo-18603419/space-use-archive/data/';
  const gpsRows = parseGpsCsv(readFileSync(rel(`${ARCH}gps_qualified.csv`), 'utf8'));
  const { fixes: realAll, report: ingest } = toFixes(gpsRows);
  const realSampling = checkSampling(realAll);
  if (ingest.clockDateMismatch || ingest.yearMismatch || ingest.monthMismatch || realSampling.outsideHours || realSampling.daysWithMore || realSampling.pairsUnder3h || realSampling.underQualified)
    throw new Error(`real ingest checks failed: ${JSON.stringify({ ingest, realSampling })}`);
  const network = parseClusterCsv(readFileSync(rel(`${ARCH}cluster_membership_by_year.csv`), 'utf8'));
  const minAge = { M: Math.floor(ingest.minAge.M), F: Math.floor(ingest.minAge.F) };
  const schedules = { M: schedulesOf(realAll.filter(f => f.sex === 'M')), F: schedulesOf(realAll.filter(f => f.sex === 'F')) };
  console.error(`real: ${realAll.length} fixes, ${realSampling.individuals} individuals, ${realSampling.indYears} individual-years; 1-fix days ${realSampling.daysWith1}, 2-fix days ${realSampling.daysWith2}; min age M ${ingest.minAge.M.toFixed(1)} F ${ingest.minAge.F.toFixed(1)}`);

  // ---------------------------------------------------------------- provenance hashes
  const hashFiles = (files: URL[]) => { const h = createHash('sha256'); for (const f of files) { h.update(f.pathname.split('/MGOGO/')[1] ?? f.pathname); h.update(readFileSync(f)); } return h.digest('hex').slice(0, 16); };
  const tsIn = (d: string) => readdirSync(rel(d)).filter(f => f.endsWith('.ts')).sort().map(f => rel(`${d}${f}`));
  const simCodeHash = hashFiles([...tsIn('src/sim/'), rel('src/simulation.ts'), rel('src/types.ts'), rel('data/params.json')]);
  const compareCodeHash = hashFiles([...tsIn('src/compare/'), new URL(import.meta.url)]);
  const scheduleHash = createHash('sha256').update(JSON.stringify(schedules)).digest('hex').slice(0, 16);
  const cacheKey = { simCodeHash, registry: REGISTRY_HASH, seeds: SEEDS, years: YEARS, burnInDays: BURN, samplerSeed: SAMPLER_SEED, scheduleHash, minAge, params: PARAMS };

  // ---------------------------------------------------------------- simulated runs
  let sims: SimResult[] = [];
  let simProv = { simCodeHash, registry: REGISTRY_HASH as string };
  if (!has('real-only')) {
    const cacheFile = rel(`${OUT}/sim-fixes.json`);
    const cached = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) as { key: typeof cacheKey; sims: SimResult[] } : null;
    const sameSettings = (k: typeof cacheKey) => JSON.stringify({ ...k, simCodeHash: '', registry: '' }) === JSON.stringify({ ...cacheKey, simCodeHash: '', registry: '' });
    if (has('reuse') && cached && sameSettings(cached.key)) {
      sims = cached.sims; simProv = { simCodeHash: cached.key.simCodeHash, registry: cached.key.registry };
      if (cached.key.simCodeHash !== simCodeHash || cached.key.registry !== REGISTRY_HASH) console.error(`sim: WARNING reusing fixes made by sim code ${cached.key.simCodeHash} / registry ${cached.key.registry}; the current code is ${simCodeHash} / ${REGISTRY_HASH}. Provenance records the code that made the fixes; re-run without --reuse to refresh.`);
      else console.error('sim: reusing cached fixes (same sim code, registry, seeds and sampling)');
    }
    else {
      if (has('reuse')) console.error('sim: cache missing or made with other settings; re-running');
      const { runPool } = await import('./lib/pool');
      const jobs: SimJob[] = SEEDS.map(seed => ({ seed, years: YEARS, burnInDays: BURN, minAge, schedules, samplerSeed: SAMPLER_SEED, params: PARAMS }));
      console.error(`sim: ${jobs.length} field-profile worlds × (${BURN} burn-in days + ${YEARS} years) on ${WORKERS} workers …`);
      sims = await runPool<SimJob, SimResult>(new URL(import.meta.url), jobs, { size: WORKERS, onDone: (i, ms) => console.error(`  seed ${jobs[i].seed} done in ${(ms / 60000).toFixed(1)} min`) });
      writeFileSync(cacheFile, JSON.stringify({ key: cacheKey, sims }));
    }
  }

  // ---------------------------------------------------------------- analyses (identical code for both sides)
  const PRE = [2011, 2012, 2013, 2014]; // before the network polarized in 2015 (Sandel et al. 2026)
  const realQ = qualify(realAll), hReal = fixedBandwidth(realQ);
  const realYears = [...byYear(realQ).values()].map(f => analyseYear(f, hReal));
  const realPairs: YearPair[] = [];
  const ry = byYear(realQ), ryKeys = [...ry.keys()];
  for (let i = 1; i < ryKeys.length; i++) if (ryKeys[i] === ryKeys[i - 1] + 1) realPairs.push(yearToYear(ry.get(ryKeys[i - 1])!, ry.get(ryKeys[i])!, hReal));
  const fission = realFission(realYears, network, realQ, hReal);
  console.error(`real: h = ${hReal.toFixed(0)} m (the notebook reports ≈ 420 m); ${realYears.length} years analysed`);

  interface SeedAn { seed: number; h: number; years: (YearAnalysis & { name: string })[]; pairs: (YearPair & { name: string })[]; between: { year: number; pair: string; ba: number; sepR: number }[]; sampling: ReturnType<typeof checkSampling>; sizes: SimResult['sizes'] }
  const simAn: SeedAn[] = sims.map(s => {
    const q = qualify(s.fixes) as SimFix[], h = fixedBandwidth(q);
    const comms = [...new Set(q.map(f => f.community))].sort();
    const years: SeedAn['years'] = [], pairs: SeedAn['pairs'] = [], between: SeedAn['between'] = [];
    for (const c of comms) {
      const cy = byYear(q.filter(f => f.community === c));
      for (const [, f] of cy) if (new Set(f.map(v => v.ind)).size >= 2) years.push({ ...analyseYear(f, h), name: c });
      const ks = [...cy.keys()];
      for (let i = 1; i < ks.length; i++) pairs.push({ ...yearToYear(cy.get(ks[i - 1])!, cy.get(ks[i])!, h), name: c });
    }
    for (const [y, f] of byYear(q)) {
      const sets = comms.map(c => f.filter(v => (v as SimFix).community === c)).filter(v => v.length);
      if (sets.length < 2) continue;
      const po = pooledOverlap(sets, h), names = comms.filter(c => f.some(v => (v as SimFix).community === c));
      for (let i = 0; i < sets.length; i++) for (let j = 0; j < i; j++) between.push({ year: y, pair: `${names[j]}–${names[i]}`, ba: po.ba[i][j], sepR: po.sepR[i][j] });
    }
    return { seed: s.seed, h, years, pairs, between, sampling: checkSampling(q), sizes: s.sizes };
  });

  // ---------------------------------------------------------------- scorecard
  const km2 = (v: number) => v / 1e6;
  type Row = ScoreRow;
  const rows: Row[] = [];
  const indVals = (ys: YearAnalysis[], f: (i: YearAnalysis['inds'][number]) => number) => ys.flatMap(y => y.inds.map(f));
  const annual = (ys: YearAnalysis[], f: (i: YearAnalysis['inds'][number]) => number) => ys.map(y => median(y.inds.map(f)));
  const nSeeds = simAn.length;
  function scalarRow(id: string, label: string, unit: string, level: string, kind: 'ratio' | 'difference', realAll: number[], realAnnual: number[], seedVals: number[], simN: number, note = '', pre?: number) {
    const r = mkScalar(id, label, unit, level, kind, realAll, realAnnual, seedVals, simN, note, pre);
    r.real.spreadOf = 'annual medians';
    rows.push(r);
  }
  const preYears = realYears.filter(y => PRE.includes(y.year));
  const simInd = (f: (i: YearAnalysis['inds'][number]) => number) => simAn.map(s => median(s.years.flatMap(y => y.inds.map(f))));
  const simIndN = simAn.reduce((a, s) => a + s.years.reduce((b, y) => b + y.inds.length, 0), 0);
  const indRow = (id: string, label: string, unit: string, kind: 'ratio' | 'difference', f: (i: YearAnalysis['inds'][number]) => number, note = '') =>
    scalarRow(id, label, unit, 'individual-year', kind, indVals(realYears, f), annual(realYears, f), simInd(f), simIndN, note, median(indVals(preYears, f)));
  indRow('area95', 'Individual 95% kernel area', 'km²', 'ratio', i => km2(i.area95));
  indRow('area50', 'Individual 50% (core) kernel area', 'km²', 'ratio', i => km2(i.area50));
  const sexRow = (sex: 'M' | 'F', name: string) => {
    const f = (i: YearAnalysis['inds'][number]) => (i.sex === sex ? km2(i.area95) : NaN), fin = (a: number[]) => a.filter(Number.isFinite);
    scalarRow(`area95${sex}`, `Individual 95% kernel area, ${name}`, 'km²', 'individual-year', 'ratio', fin(indVals(realYears, f)), realYears.map(y => median(fin(y.inds.map(f)))).filter(Number.isFinite),
      simAn.map(s => median(fin(s.years.flatMap(y => y.inds.map(f))))).filter(Number.isFinite), simIndN, '', median(fin(indVals(preYears, f))));
  };
  sexRow('M', 'males'); sexRow('F', 'females');
  indRow('core', 'Core fraction (50% ÷ 95% area)', 'fraction', 'difference', i => i.core);
  indRow('elong', 'Range elongation (principal-axis SD ratio)', 'ratio', 'ratio', i => i.elong);
  scalarRow('share', 'Individual range ÷ community range (same year)', 'fraction', 'individual-year', 'difference', indVals(preYears, i => i.share), annual(preYears, i => i.share), simInd(i => i.share), simIndN,
    'Real: pre-fission years 2011–2014 only (one community).');
  const simComm = (f: (y: YearAnalysis) => number) => simAn.map(s => median(s.years.map(f)));
  const simCommN = simAn.reduce((a, s) => a + s.years.length, 0);
  scalarRow('commArea95', 'Community annual 95% kernel area (pooled fixes)', 'km²', 'community-year', 'ratio', preYears.map(y => km2(y.community.area95)), preYears.map(y => km2(y.community.area95)), simComm(y => km2(y.community.area95)), simCommN,
    'Real: Ngogo 2011–2014 (~200 members, the largest known community); sim communities hold 12–22 members by design. Literature band for a 22-member community: 5–16 km² (T-RNG-1).');
  scalarRow('commCore', 'Community core fraction (50% ÷ 95%)', 'fraction', 'community-year', 'difference', preYears.map(y => y.community.core), preYears.map(y => y.community.core), simComm(y => y.community.core), simCommN, 'Real: 2011–2014.');
  const pairVals = (ps: YearPair[], f: (p: YearPair) => number[]) => ps.flatMap(f);
  const simPair = (f: (p: YearPair) => number[]) => simAn.map(s => median(s.pairs.flatMap(f)));
  const simPairN = simAn.reduce((a, s) => a + s.pairs.reduce((b, p) => b + p.indBA.length, 0), 0);
  scalarRow('ytyBA', 'Year-to-year overlap of an individual’s range (BA)', 'affinity', 'individual', 'difference', pairVals(realPairs, p => p.indBA), realPairs.map(p => median(p.indBA)), simPair(p => p.indBA), simPairN);
  scalarRow('ytyShiftR', 'Year-to-year shift of an individual’s range centre', 'range radii', 'individual', 'difference', pairVals(realPairs, p => p.indShiftR), realPairs.map(p => median(p.indShiftR)), simPair(p => p.indShiftR), simPairN);
  scalarRow('ytyShiftKm', 'Year-to-year shift of an individual’s range centre', 'km', 'individual', 'ratio', pairVals(realPairs, p => p.indShiftM.map(v => v / 1000)), realPairs.map(p => median(p.indShiftM) / 1000), simPair(p => p.indShiftM.map(v => v / 1000)), simPairN);
  const yearMed = (ys: YearAnalysis[], get: (y: YearAnalysis) => number[]) => ys.map(y => median(get(y))).filter(Number.isFinite);
  const seedMed = (get: (y: YearAnalysis) => number[]) => simAn.map(s => median(s.years.flatMap(get))).filter(Number.isFinite);
  const simDispN = simAn.reduce((a, s) => a + s.years.reduce((b, y) => b + y.disp.length, 0), 0);
  scalarRow('dispKm', 'Displacement between an individual’s two same-day fixes (≥ 3 h apart)', 'km', 'individual-day', 'ratio', realYears.flatMap(y => y.disp.map(v => v / 1000)), yearMed(realYears, y => y.disp.map(v => v / 1000)), seedMed(y => y.disp.map(v => v / 1000)), simDispN,
    'The only movement measure the 1–2 fixes/day subsample supports (not a path length); time gaps match by construction (schedules copied).', median(preYears.flatMap(y => y.disp)) / 1000);
  scalarRow('dispR', 'Same-day displacement in range radii', 'range radii', 'individual-day', 'difference', realYears.flatMap(y => y.dispR), yearMed(realYears, y => y.dispR), seedMed(y => y.dispR), simDispN, '', median(preYears.flatMap(y => y.dispR)));
  const prePairs = realPairs.filter(p => PRE.includes(p.to));
  scalarRow('commYtyBA', 'Year-to-year overlap of the community range (BA)', 'affinity', 'community', 'difference', prePairs.map(p => p.commBA), prePairs.map(p => p.commBA), simAn.map(s => median(s.pairs.map(p => p.commBA))), simAn.reduce((a, s) => a + s.pairs.length, 0), 'Real: 2011→2014 pairs.');
  const splitVal = (ys: YearAnalysis[], f: (s: NonNullable<YearAnalysis['split']>) => number) => ys.filter(y => y.split).map(y => f(y.split!));
  const simSplit = (f: (s: NonNullable<YearAnalysis['split']>) => number) => simAn.map(s => median(splitVal(s.years, f))).filter(Number.isFinite);
  scalarRow('pairBA', 'Mean pairwise overlap among community members (BA)', 'affinity', 'community-year', 'difference', splitVal(preYears, s => s.meanBA), splitVal(preYears, s => s.meanBA), simSplit(s => s.meanBA), simCommN, 'Real: 2011–2014.');
  scalarRow('silhouette', 'Spatial substructure: silhouette of the best two-group split', 'width', 'community-year', 'difference', splitVal(preYears, s => s.silhouette), splitVal(preYears, s => s.silhouette), simSplit(s => s.silhouette), simCommN, 'Real: 2011–2014; ward.D2 on 1 − BA as the notebook.');
  scalarRow('bc', 'Bimodality coefficient of pairwise BA (notebook formula)', 'coefficient', 'community-year', 'difference', splitVal(preYears, s => s.bc), splitVal(preYears, s => s.bc), simSplit(s => s.bc), simCommN, 'Real: 2011–2014. Pearson kurtosis as in the notebook, so the usual 5/9 cut-off does not apply.');

  // distributions: KS D against a leave-one-year-out real baseline
  const realEdge = realYears.flatMap(y => y.edge), realRad = realYears.flatMap(y => y.radial);
  const looKs = (get: (y: YearAnalysis) => number[]) => realYears.map(y => ks2(get(y), realYears.filter(z => z !== y).flatMap(get)));
  const distRow = (id: string, label: string, get: (y: YearAnalysis) => number[], realV: number[]) => {
    const simV = simAn.flatMap(s => s.years.flatMap(get)), perSeed = simAn.map(s => ks2(s.years.flatMap(get), realV)), base = looKs(get), d = ks2(simV, realV);
    rows.push({ id, label, unit: 'range radii', level: 'fix', distance: 'KS D', real: { value: median(realV), lo: quantile(realV, 0.1), hi: quantile(realV, 0.9), spreadOf: '10th–90th percentile of fixes', n: realV.length },
      sim: { value: median(simV), lo: quantile(simV, 0.1), hi: quantile(simV, 0.9), seeds: simAn.map(s => median(s.years.flatMap(get))), n: simV.length }, dist: d, distSeeds: [Math.min(...perSeed), Math.max(...perSeed)], baseline: Math.max(...base),
      verdict: simV.length ? distanceVerdict(d, base, nSeeds) : 'not comparable', note: `Baseline: largest KS D of one real year against all other years (${Math.max(...base).toFixed(3)}).` });
  };
  distRow('edge', 'Distance of fixes inside their own 95% edge', y => y.edge, realEdge);
  distRow('radial', 'Distance of fixes from their own range centre', y => y.radial, realRad);
  distRow('dispDist', 'Same-day displacement distribution (range radii)', y => y.dispR, realYears.flatMap(y => y.dispR));

  // normalized shapes: affinity of mean maps against a leave-one-year-out real baseline
  const weighted = (ys: YearAnalysis[], pick: (y: YearAnalysis) => NormGrid, w: (y: YearAnalysis) => number) => {
    const tot = ys.reduce((a, y) => a + w(y), 0), g = pick(ys[0]), d = new Float64Array(g.d.length);
    for (const y of ys) { const p = pick(y), k = w(y) / tot; for (let i = 0; i < d.length; i++) d[i] += p.d[i] * k; }
    return { n: g.n, half: g.half, d };
  };
  const realIndMap = weighted(realYears, y => y.indNorm, y => y.inds.length), realCommMap = meanNorm(preYears.map(y => y.commNorm));
  const simYears = simAn.flatMap(s => s.years);
  const simIndMap = simYears.length ? weighted(simYears, y => y.indNorm, y => y.inds.length) : null, simCommMap = simYears.length ? meanNorm(simYears.map(y => y.commNorm)) : null;
  const shapeRow = (id: string, label: string, realMap: NormGrid, simMap: NormGrid | null, ys: YearAnalysis[], pick: (y: YearAnalysis) => NormGrid, w: (y: YearAnalysis) => number, seedMaps: NormGrid[], note: string) => {
    const base = ys.map(y => 1 - normAffinity(pick(y), weighted(ys.filter(z => z !== y), pick, w)));
    const d = simMap ? 1 - normAffinity(realMap, simMap) : NaN, perSeed = seedMaps.map(m => 1 - normAffinity(realMap, m));
    rows.push({ id, label, unit: 'map', level: 'shape', distance: '1 − BA', real: { value: normMass(realMap), lo: NaN, hi: NaN, spreadOf: 'mass inside ±2.5 r', n: ys.length }, sim: { value: simMap ? normMass(simMap) : NaN, lo: NaN, hi: NaN, seeds: [], n: seedMaps.length },
      dist: d, distSeeds: perSeed.length ? [Math.min(...perSeed), Math.max(...perSeed)] : undefined, baseline: Math.max(...base), verdict: simMap ? distanceVerdict(d, base, nSeeds) : 'not comparable', note: `${note} Baseline: largest 1 − BA of one real year's map against the other years (${Math.max(...base).toFixed(4)}).` });
  };
  shapeRow('mapInd', 'Normalized individual range map (mean)', realIndMap, simIndMap, realYears, y => y.indNorm, y => y.inds.length, simAn.filter(s => s.years.length).map(s => weighted(s.years, y => y.indNorm, y => y.inds.length)), 'Each map centred, scaled by r, rotated to its principal axes.');
  shapeRow('mapComm', 'Normalized community range map (mean)', realCommMap, simCommMap, preYears, y => y.commNorm, () => 1, simAn.filter(s => s.years.length).map(s => meanNorm(s.years.map(y => y.commNorm))), 'Real: 2011–2014.');
  rows.push({ id: 'fission', label: 'Range divergence after a community fission', unit: 'BA', level: 'community', distance: 'none', real: { value: median(fission.filter(f => f.year >= 2018).map(f => f.groupBA)), lo: Math.min(...fission.map(f => f.groupBA)), hi: Math.max(...fission.map(f => f.groupBA)), spreadOf: 'West–Central pooled-range BA, all years', n: fission.length },
    sim: { value: NaN, lo: NaN, hi: NaN, seeds: [], n: 0 }, dist: NaN, verdict: 'not comparable', note: 'No simulated community split in these runs (fission, objective O6, is not built yet); the real West–Central divergence is shown for reference.' });

  // ---------------------------------------------------------------- outputs
  const r4 = (v: number) => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : null);
  const gridOut = (g: NormGrid | null) => (g ? { n: g.n, half: g.half, mass: r4(normMass(g)), d: Array.from(g.d, v => Math.round(v * 1e4) / 1e4) } : null);
  const bins = 40, dens = (v: number[], lo: number, hi: number) => histogram(v, lo, hi, bins).density.map(r4);
  const seedBand = (get: (y: YearAnalysis) => number[], lo: number, hi: number) => {
    const per = simAn.map(s => histogram(s.years.flatMap(get), lo, hi, bins).density);
    return per.length ? { lo: per[0].map((_, i) => r4(Math.min(...per.map(p => p[i])))), hi: per[0].map((_, i) => r4(Math.max(...per.map(p => p[i])))) } : null;
  };
  const distOut = (realV: number[], simV: number[], get: ((y: YearAnalysis) => number[]) | null, lo: number, hi: number, perSeed?: number[][]) => ({
    lo, hi, bins, real: dens(realV, lo, hi), sim: simV.length ? dens(simV, lo, hi) : null,
    simBand: get ? seedBand(get, lo, hi) : perSeed && perSeed.length ? (() => { const p = perSeed.map(v => histogram(v, lo, hi, bins).density); return { lo: p[0].map((_, i) => r4(Math.min(...p.map(q => q[i])))), hi: p[0].map((_, i) => r4(Math.max(...p.map(q => q[i])))) }; })() : null });
  const simYty = (f: (p: YearPair) => number[]) => simAn.flatMap(s => s.pairs.flatMap(f));
  const realAnnualRows = realYears.map(y => ({ year: y.year, individuals: y.inds.length, fixes: y.nFix, area95Km2: r4(median(y.inds.map(i => km2(i.area95)))), area50Km2: r4(median(y.inds.map(i => km2(i.area50)))),
    core: r4(median(y.inds.map(i => i.core))), communityArea95Km2: r4(km2(y.community.area95)), meanPairBA: r4(y.split?.meanBA ?? NaN) }));
  const sizes = simAn.flatMap(s => s.sizes.map(z => ({ seed: s.seed, ...z })));
  const provenance = {
    generated: new Date().toISOString(), script: 'scripts/compare-ranging.ts', compareCodeHash,
    sim: { profile: 'field', params: JSON.stringify(PARAMS), registry: simProv.registry, simCodeHash: simProv.simCodeHash, currentSimCodeHash: simCodeHash, seeds: SEEDS, yearsSampled: YEARS, burnInDays: BURN, samplerSeed: SAMPLER_SEED, bandwidthM: simAn.map(s => ({ seed: s.seed, h: Math.round(s.h) })),
      communitySizes: sizes, sampling: 'Each mature simulated individual-year (age ≥ the real minimum, 12 y) receives the sampling schedule (days of year and clock times) of a random real individual-year of the same sex; positions are read at those 15-min clock times; the individual-year keeps the fixes in its majority community; then the real filter (≥ 30 fixes over ≥ 4 months).',
      runsReduced: SEEDS.length < MIN_SEEDS ? `only ${SEEDS.length} seeds: verdicts are inconclusive by rule` : null },
    gapHoursMedian: { real: r4(median(realYears.flatMap(y => y.dispHours))), sim: simAn.length ? r4(median(simAn.flatMap(s => s.years.flatMap(y => y.dispHours)))) : null },
    real: { fixes: realAll.length, individuals: realSampling.individuals, individualYears: realSampling.indYears, years: [ryKeys[0], ryKeys[ryKeys.length - 1]], bandwidthM: Math.round(hReal), daysWith1Fix: realSampling.daysWith1, daysWith2Fixes: realSampling.daysWith2 },
  };
  const attribution = 'Real data: Sandel A, Lee KC, Angedakin S, Birungi C, Kanweri D, Kalunga D et al. (2026) Space Use Analysis for "Lethal conflict after group fission in wild chimpanzees". Zenodo, doi:10.5281/zenodo.18603419, CC BY 4.0; supplement to Sandel AA, He Y, Ren J et al. (2026) Lethal conflict after group fission in wild chimpanzees. Science 392(6794):216–220, doi:10.1126/science.adz4944. Derived statistics and normalized maps by MGOGO; not endorsed by the authors.';
  const method = {
    projection: 'WGS84 → UTM 36N (EPSG:32636) for real fixes; the simulation is already in metres.',
    kernel: 'Bivariate normal kernel, fixed h = median over individual-years of mean(sd x, sd y)·n^(−1/6) (per dataset: real; each sim seed); 100-node grid over each study-year extended by its span (adehabitatHR kernelUD grid = 100, extent = 1, same4all = TRUE).',
    isopleths: 'Volume UD; 95% and 50% areas by cell count; r = √(A95/π).',
    overlap: 'Bhattacharyya affinity over the whole grid (kerneloverlaphr "BA").',
    split: 'Ward (ward.D2) two-group cut of 1 − BA per year; real groups labelled West/Central by majority of network-cluster membership that year.',
    normalization: 'Each UD centred on its 95% use-weighted centroid, scaled by r, rotated to principal axes, reflected so the longer tails point to +u, +v; sampled on a 40 × 40 grid over ±2.5 r.',
    notMirrored: 'Hartigan dip test, Gaussian mixtures and ARI of the notebook are not computed; bimodality coefficient only.',
    fieldClock: 'The archive DateTime values carry "Z" but are local field times written from a US Central session; rendering them in America/Chicago puts all 166,826 fixes in 08:00–17:59 on their GPS_date.',
  };
  const caveats = [
    'Different communities: Ngogo had ~200 members and > 30 adult males by 2015 (Sandel & Watts 2021) and is the largest known community; the simulated communities hold 12–22 members by design, so absolute areas are not expected to match Ngogo. For a 22-member community the literature band is 5–16 km² (T-RNG-1).',
    'Real fixes come from focal follows: which individuals and days were followed reflects field effort. The simulation copies whole real schedules (days, clock times, fixes per day) but draws the individual at random and does not reproduce party co-sampling.',
    'The 1–2 fixes/day subsample cannot measure daily path length, step lengths, turning angles, straightness or patrols (PROVENANCE.md); only the displacement between two same-day fixes ≥ 3 h apart is a movement measure here.',
    `Real: ${ryKeys.length} years (${ryKeys[0]}–${ryKeys[ryKeys.length - 1]}), fission in 2015–2018. Sim: ${YEARS} years per seed after a ${BURN}-day burn-in, so year-to-year statistics rest on ${Math.max(0, YEARS - 1)} transition(s) per community per seed.`,
    'Measured ranges come from simulated positions, not from the simulation\'s own range bookkeeping (troop.range, a utilization grid with a 180-day memory seeded from nominal circles), which can lag actual use.',
    'The simulation is under active development (stage C6, territories); these results hold for the sim code hash and registry recorded in provenance. Re-run with the same command after changes.',
  ];
  const verdictRules = 'Scalar: similar if the sim median lies inside the range of real annual medians; different if no seed does; otherwise inconclusive. Distribution / map: distance ≤ the largest real leave-one-year-out distance is similar, > 2× it is different, otherwise inconclusive. Fewer than 5 seeds: inconclusive.';
  const guide = {
    title: 'Real vs simulated home ranges', role: C12_DEV_ROLE, attribution, provenance, method, verdictRules, caveats,
    privacy: 'No coordinates, positions, names or orientations: maps are centred, scaled by range radius, rotated and reflected; statistics are areas, ratios and distances in range radii.',
    scorecard: rows.map(r => ({ ...r, real: { ...r.real, value: r4(r.real.value), lo: r4(r.real.lo), hi: r4(r.real.hi), preFission: r.real.preFission === undefined ? undefined : r4(r.real.preFission) },
      sim: { ...r.sim, value: r4(r.sim.value), lo: r4(r.sim.lo), hi: r4(r.sim.hi), seeds: r.sim.seeds.map(r4) }, dist: r4(r.dist), distSeeds: r.distSeeds?.map(r4), baseline: r.baseline === undefined ? undefined : r4(r.baseline) })),
    maps: { units: 'density per r², u along the major axis, v along the minor axis, both in range radii', real: { individual: gridOut(realIndMap), community: gridOut(realCommMap) }, sim: { individual: gridOut(simIndMap), community: gridOut(simCommMap) } },
    distributions: {
      edge: distOut(realEdge, simAn.flatMap(s => s.years.flatMap(y => y.edge)), y => y.edge, -0.5, 1.5),
      radial: distOut(realRad, simAn.flatMap(s => s.years.flatMap(y => y.radial)), y => y.radial, 0, 3),
      displacementR: distOut(realYears.flatMap(y => y.dispR), simAn.flatMap(s => s.years.flatMap(y => y.dispR)), y => y.dispR, 0, 2),
      yearToYearBA: distOut(pairVals(realPairs, p => p.indBA), simYty(p => p.indBA), null, 0, 1, simAn.map(s => s.pairs.flatMap(p => p.indBA))),
      yearToYearShiftR: distOut(pairVals(realPairs, p => p.indShiftR), simYty(p => p.indShiftR), null, 0, 2, simAn.map(s => s.pairs.flatMap(p => p.indShiftR))),
    },
    realAnnual: realAnnualRows,
    realYearPairs: realPairs.map(p => ({ from: p.from, to: p.to, individuals: p.indBA.length, medianBA: r4(median(p.indBA)), medianShiftR: r4(median(p.indShiftR)), communityBA: r4(p.commBA), communityShiftR: r4(p.commShiftR) })),
    fission: {
      real: fission.map(f => ({ ...f, groupBA: r4(f.groupBA), sepR: r4(f.sepR), within: r4(f.within), between: r4(f.between), silhouette: r4(f.silhouette), bc: r4(f.bc), networkAgreement: r4(f.networkAgreement) })),
      simWithinCommunitySplit: simAn.length ? { groupBA: summ(simAn.flatMap(s => splitVal(s.years, x => x.groupBA))), sepR: summ(simAn.flatMap(s => splitVal(s.years, x => x.sepR))), silhouette: summ(simAn.flatMap(s => splitVal(s.years, x => x.silhouette))) } : null,
      simBetweenCommunities: simAn.length ? { ba: summ(simAn.flatMap(s => s.between.map(b => b.ba))), sepR: summ(simAn.flatMap(s => s.between.map(b => b.sepR))) } : null,
      simSplits: 0,
    },
  };
  function summ(v: number[]) { return v.length ? { median: r4(median(v)), lo: r4(Math.min(...v)), hi: r4(Math.max(...v)), n: v.length } : null; }
  assertNonSensitive(guide, new Set(realAll.map(f => f.ind)));
  mkdirSync(dirname(rel(GUIDE).pathname), { recursive: true });
  writeFileSync(rel(GUIDE), JSON.stringify(guide) + '\n');
  // artifacts (gitignored): per-individual-year stats with names (no coordinates), the full result, the scorecard
  writeFileSync(rel(`${OUT}/real-indyears.json`), JSON.stringify(realYears.flatMap(y => y.inds), null, 1));
  writeFileSync(rel(`${OUT}/result.json`), JSON.stringify({ ...guide, sim: simAn.map(s => ({ seed: s.seed, h: s.h, sampling: s.sampling, between: s.between, indYears: s.years.flatMap(y => y.inds.map(i => ({ ...i, community: y.name }))) })) }, null, 1));
  writeFileSync(rel(`${OUT}/scorecard.md`), scorecardMd('Real vs simulated home ranges: similarity scorecard', [`Role: ${C12_DEV_ROLE}.`, `Sim: field profile, seeds ${SEEDS.join(', ')}, ${YEARS} sampled years after a ${BURN}-day burn-in; registry ${provenance.sim.registry}, sim code ${provenance.sim.simCodeHash}.`], rows, attribution, verdictRules, 'Real 2011–14', caveats));
  writeFigures(rel(`${OUT}/figures/`), { realIndMap, simIndMap, realCommMap, simCommMap, guide, fission, rows, simAn: simAn.map(s => ({ between: s.between, splits: s.years.filter(y => y.split).map(y => y.split!) })) });
  console.error(`done in ${((performance.now() - t0) / 1000).toFixed(0)} s → ${GUIDE}, ${OUT}/`);
  console.log(scorecardMd('Real vs simulated home ranges: similarity scorecard', [`Role: ${C12_DEV_ROLE}.`, `Sim: field profile, seeds ${SEEDS.join(', ')}, ${YEARS} sampled years after a ${BURN}-day burn-in; registry ${provenance.sim.registry}, sim code ${provenance.sim.simCodeHash}.`], rows, attribution, verdictRules, 'Real 2011–14', caveats));
}

/** Real West vs Central divergence per year: spatial split labelled by network-cluster majority (see method.split). */
function realFission(years: YearAnalysis[], network: ReturnType<typeof parseClusterCsv>, fixes: Fix[], h: number) {
  const out: { year: number; nWest: number; nCentral: number; groupBA: number; sepR: number; within: number; between: number; silhouette: number; bc: number; networkAgreement: number }[] = [];
  const fy = byYear(fixes);
  let prevWest: [number, number] | null = null;
  for (const y of years) {
    if (!y.split) continue;
    const names = y.internal.names, lab = y.split.labels, net = network.filter(n => n.year === y.year);
    const regionOf = new Map<string, boolean>();
    for (const n of net) for (const m of n.members) regionOf.set(m, n.region.startsWith('West'));
    const westShare = [0, 1].map(g => { const ms = names.filter((nm, i) => lab[i] === g && regionOf.has(nm)); return ms.length ? ms.filter(m => regionOf.get(m)).length / ms.length : NaN; });
    const f = fy.get(y.year)!, sets = [0, 1].map(g => f.filter(v => lab[names.indexOf(v.ind)] === g));
    const po = pooledOverlap(sets, h);
    let west: number;
    if (Number.isFinite(westShare[0]) && Number.isFinite(westShare[1]) && westShare[0] !== westShare[1]) west = westShare[0] > westShare[1] ? 0 : 1;
    else if (prevWest) west = po.shapes.map(s => Math.hypot(s.cx - prevWest![0], s.cy - prevWest![1])).indexOf(Math.min(...po.shapes.map(s => Math.hypot(s.cx - prevWest![0], s.cy - prevWest![1]))));
    else west = 0;
    prevWest = [po.shapes[west].cx, po.shapes[west].cy];
    let agree = 0, known = 0;
    names.forEach((nm, i) => { if (regionOf.has(nm)) { known++; if ((lab[i] === west) === regionOf.get(nm)) agree++; } });
    out.push({ year: y.year, nWest: lab.filter(l => l === west).length, nCentral: lab.filter(l => l !== west).length, groupBA: po.ba[0][1], sepR: po.sepR[0][1], within: y.split.within, between: y.split.between,
      silhouette: y.split.silhouette, bc: y.split.bc, networkAgreement: known ? agree / known : NaN });
  }
  return out;
}

function writeFigures(dir: URL, x: { realIndMap: NormGrid; simIndMap: NormGrid | null; realCommMap: NormGrid; simCommMap: NormGrid | null; guide: { distributions: Record<string, { lo: number; hi: number; bins: number; real: (number | null)[]; sim: (number | null)[] | null; simBand: { lo: (number | null)[]; hi: (number | null)[] } | null }> }; fission: ReturnType<typeof realFission>; rows: { id: string; label: string; distance: string; real: { value: number; lo: number; hi: number }; sim: { value: number; lo: number; hi: number }; verdict: string }[]; simAn: { between: { ba: number; sepR: number }[]; splits: { groupBA: number; silhouette: number }[] }[] }) {
  const src = 'Real: Ngogo GPS subsample 2011–2023 (Sandel et al. 2026, Zenodo 10.5281/zenodo.18603419, CC BY 4.0). Sim: MGOGO field profile.';
  const ind = [{ name: 'Real (Ngogo)', grid: x.realIndMap, color: REAL }, ...(x.simIndMap ? [{ name: 'Simulated', grid: x.simIndMap, color: SIM }] : [])];
  writeFileSync(new URL('ud-individual.svg', dir), heatmapFigure('Individual annual ranges, normalized', `Mean of individual-year UDs, each centred, scaled by its range radius and rotated. ${src}`, ind));
  const com = [{ name: 'Real (Ngogo 2011–14)', grid: x.realCommMap, color: REAL }, ...(x.simCommMap ? [{ name: 'Simulated', grid: x.simCommMap, color: SIM }] : [])];
  writeFileSync(new URL('ud-community.svg', dir), heatmapFigure('Community annual ranges, normalized', `Pooled-fix UD per community-year, normalized the same way. ${src}`, com));
  const dser = (k: string) => {
    const d = x.guide.distributions[k], w = (d.hi - d.lo) / d.bins, xs = d.real.map((_, i) => d.lo + (i + 0.5) * w);
    const s: Series[] = [{ name: 'Real', color: REAL, x: xs, y: d.real.map(v => v ?? NaN) }];
    if (d.sim) s.push({ name: 'Simulated (band: seed range)', color: SIM, x: xs, y: d.sim.map(v => v ?? NaN), lo: d.simBand?.lo.map(v => v ?? NaN), hi: d.simBand?.hi.map(v => v ?? NaN) });
    return s;
  };
  writeFileSync(new URL('edge-distance.svg', dir), lineFigure('Where fixes fall within their range', src, [
    { name: 'Distance inside the own 95% edge', xLabel: 'distance to the 95% boundary (range radii; < 0 outside)', yLabel: 'density', series: dser('edge'), refX: [0], xRange: [-0.5, 1.5], xTicks: [-0.5, 0, 0.5, 1, 1.5] },
    { name: 'Distance from the own range centre', xLabel: 'distance from the 95% centroid (range radii)', yLabel: 'density', series: dser('radial'), refX: [1], xRange: [0, 3], xTicks: [0, 0.5, 1, 1.5, 2, 2.5, 3] }]));
  writeFileSync(new URL('displacement.svg', dir), lineFigure('How far an individual moves between its two fixes of a day', `Fixes ≥ 3 h apart, 08:00–17:59; same sampling schedules on both sides. ${src}`, [
    { name: 'Same-day displacement', xLabel: 'straight-line displacement (range radii)', yLabel: 'density', series: dser('displacementR'), xRange: [0, 2], xTicks: [0, 0.5, 1, 1.5, 2] }]));
  writeFileSync(new URL('year-to-year.svg', dir), lineFigure('Year-to-year range fidelity (same individual, consecutive years)', src, [
    { name: 'Overlap of consecutive-year UDs', xLabel: 'Bhattacharyya affinity', yLabel: 'density', series: dser('yearToYearBA'), xRange: [0, 1], xTicks: [0, 0.25, 0.5, 0.75, 1] },
    { name: 'Shift of the range centre', xLabel: 'centroid shift (range radii)', yLabel: 'density', series: dser('yearToYearShiftR'), xRange: [0, 2], xTicks: [0, 0.5, 1, 1.5, 2] }]));
  const yrs = x.fission.map(f => f.year), flat = (v: number) => yrs.map(() => v);
  const simGroup = x.simAn.flatMap(s => s.splits.map(p => p.groupBA)), simBetween = x.simAn.flatMap(s => s.between.map(b => b.ba)), simSil = x.simAn.flatMap(s => s.splits.map(p => p.silhouette));
  const fa: Series[] = [{ name: 'Real West vs Central, pooled ranges', color: REAL, x: yrs, y: x.fission.map(f => f.groupBA) }];
  if (simGroup.length) fa.push({ name: 'Sim: best split of one community', color: SIM, x: yrs, y: flat(median(simGroup)), dash: '6 4' });
  if (simBetween.length) fa.push({ name: 'Sim: neighbouring communities', color: INK2, x: yrs, y: flat(median(simBetween)), dash: '2 3' });
  const fb: Series[] = [{ name: 'Real', color: REAL, x: yrs, y: x.fission.map(f => f.silhouette) }];
  if (simSil.length) fb.push({ name: 'Sim: one community (median)', color: SIM, x: yrs, y: flat(median(simSil)), dash: '6 4' });
  writeFileSync(new URL('fission.svg', dir), lineFigure('Range divergence around the Ngogo fission', `Network polarized 2015, two groups by 2018 (Sandel et al. 2026). Sim lines are medians over seeds and years (no simulated fission). ${src}`, [
    { name: 'Overlap of the two spatial groups (BA)', xLabel: 'year', yLabel: 'Bhattacharyya affinity', series: fa, yRange: [0, 1], refX: [2015, 2018], xTicks: yrs.filter(v => v % 2 === 1) },
    { name: 'Strength of the two-group split', xLabel: 'year', yLabel: 'mean silhouette width', series: fb, yRange: [0, 1], refX: [2015, 2018], xTicks: yrs.filter(v => v % 2 === 1) }]));
  const forest: ForestRow[] = x.rows.filter(r => (r.distance === 'ratio' || r.distance === 'difference') && r.real.value > 0 && r.sim.lo > 0 && r.real.lo > 0)
    .map(r => ({ label: r.label.replace(/ \(.*\)$/, ''), ratio: r.sim.value / r.real.value, lo: r.sim.lo / r.real.value, hi: r.sim.hi / r.real.value, realLo: r.real.lo / r.real.value, realHi: r.real.hi / r.real.value, verdict: r.verdict }));
  if (forest.length) writeFileSync(new URL('scorecard.svg', dir), forestFigure('Simulated ÷ real, by statistic', src, forest));
}
