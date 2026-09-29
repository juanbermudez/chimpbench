// Gombe 15-min focal paths vs Taï and simulated follows (realism C12, held out: nobody tunes against these numbers).
// Real: Pusey AE, Schroepfer-Walker K (2013) Female competition in chimpanzees. Phil Trans R Soc B 368: 20130077; data
// Dryad doi:10.5061/dryad.jg05d (CC0), Kasekela community, Gombe National Park, 2000–2003 (eastern chimpanzees,
// P. t. schweinfurthii). Sim: the follows cached by scripts/compare-movement.ts (artifacts/compare-movement/sim-follows.json,
// 30-min records copying Taï follow schedules); this script never runs the sim, so the 15-min simulated values stay pending.
//
//   pnpm exec tsx scripts/compare-gombe-paths.ts [--out docs/data/gombe-paths.json] [--sim artifacts/compare-movement/sim-follows.json]
//
// Normalization as in compare-movement: step, path and displacement in units of the community's range radius r, the
// equal-area radius of its 95% kernel, with the bandwidth at the Taï ratio h/r (docs/data/movement-compare.json,
// provenance.sim.bandwidthOverR). Outputs only statistics and binned distributions: no coordinates, no dates finer than a
// year, no identities beyond the female rank class.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { communityRange, every30, femaleCores, gombeFollows, pathStats, type PathPoint, type PathStats } from '../src/compare/gombe-paths';
import { median, percentile, readXlsx } from '../src/compare/patrols';
import { assertNonSensitive } from '../src/compare/report';
import { histogram } from '../src/compare/stats';
import { byFollow, scaleMatchedBandwidth, territory, type TrackPoint } from '../src/compare/tracks';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const OUT = flag('out', 'docs/data/gombe-paths.json'), SIM = flag('sim', 'artifacts/compare-movement/sim-follows.json');
const root = new URL('../', import.meta.url), rel = (p: string) => new URL(p, root);
const r4 = (v: number) => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : null);
const q = (v: number[]) => ({ median: r4(median(v)), p10: r4(percentile(v, 0.1)), p90: r4(percentile(v, 0.9)), n: v.length });

// ---------------------------------------------------------------------------------------------- real
const wb = readXlsx(readFileSync(rel('data/raw/dryad-jg05d/ChimpanzeeRanges.xlsx')), b => inflateRawSync(b));
const { follows, years, report } = gombeFollows(wb.sheet('AllPoints'));
const move = JSON.parse(readFileSync(rel('docs/data/movement-compare.json'), 'utf8'));
const k = move.provenance.sim.bandwidthOverR as number;
if (!(k > 0 && k < 1)) throw new Error(`movement-compare.json: bad bandwidthOverR ${k}`);
const range = communityRange(follows, k);
const byYear = [...new Set(years)].sort().map(y => { const rg = communityRange(follows.filter((_, i) => years[i] === y), k); return { year: y, rKm: r4(rg.r / 1000), areaKm2: r4(rg.area95 / 1e6), follows: years.filter(v => v === y).length }; });
const g15 = pathStats(follows, 0.25, range.r), g30 = pathStats(every30(follows), 0.5, range.r);
const cores = femaleCores(wb.sheet('AlonePoints'), range);

const summary = (s: PathStats, rate = true) => ({
  stepM: q(s.stepM), stepR: q(s.stepR), zeroStepShare: r4(s.zeroShare), turn: q(s.turn), straight: q(s.straight), ...(rate ? { pathRate: q(s.rate) } : {}),
  dailyPathKm: q(s.pathM.map(v => v / 1000)), dailyPathR: q(s.pathR), displacementKm: q(s.netM.map(v => v / 1000)), displacementR: q(s.netR), followSpanH: q(s.spanH), follows: s.follows, fullDayFollows: s.fullDays,
});

// ---------------------------------------------------------------------------------------------- sim (cached follows only)
// Staleness: the same code hash compare-movement records (src/sim, simulation, types, params, field categories).
const hashFiles = (files: URL[]) => { const h = createHash('sha256'); for (const f of files) { h.update(f.pathname.split('/MGOGO/')[1] ?? f.pathname); h.update(readFileSync(f)); } return h.digest('hex').slice(0, 16); };
const tsIn = (d: string) => readdirSync(rel(d)).filter(f => f.endsWith('.ts')).sort().map(f => rel(`${d}${f}`));
const currentSim = hashFiles([...tsIn('src/sim/'), rel('src/simulation.ts'), rel('src/types.ts'), rel('data/params.json'), rel('src/field/categories.ts')]);
type SimPoint = TrackPoint & { year: number };
let sim: Record<string, unknown> = { status: 'pending (no cached simulated follows; run scripts/compare-movement.ts)' };
const simDist: { stepM30: number[]; stepR30: number[]; turn30: number[] } = { stepM30: [], stepR30: [], turn30: [] };
if (existsSync(rel(SIM))) {
  const cache = JSON.parse(readFileSync(rel(SIM), 'utf8')) as { key: { simCodeHash: string; seeds: number[]; years: number; burnInDays: number }; sims: { seed: number; points: SimPoint[] }[] };
  const perSeed = cache.sims.map(s => {
    const groups = [...new Set(s.points.map(p => p.group))].sort(), all: PathStats[] = [];
    for (const gname of groups) {
      const pts = s.points.filter(p => p.group === gname), t = territory(pts, scaleMatchedBandwidth(pts, k, 50, 4));
      all.push(pathStats(byFollow(pts) as PathPoint[][], 0.5, t.shape.r));
    }
    const cat = (f: (x: PathStats) => number[]) => all.flatMap(f);
    return { seed: s.seed, stepM: cat(x => x.stepM), stepR: cat(x => x.stepR), turn: cat(x => x.turn), straight: cat(x => x.straight), rate: cat(x => x.rate), pathM: cat(x => x.pathM), pathR: cat(x => x.pathR), netM: cat(x => x.netM), netR: cat(x => x.netR), follows: all.reduce((a, x) => a + x.follows, 0), fullDays: all.reduce((a, x) => a + x.fullDays, 0) };
  });
  const pooled = (f: (x: (typeof perSeed)[number]) => number[]) => perSeed.flatMap(f), seeds = (f: (x: (typeof perSeed)[number]) => number[]) => perSeed.map(x => r4(median(f(x))));
  const row = (f: (x: (typeof perSeed)[number]) => number[], scale = 1) => ({ ...q(pooled(f).map(v => v * scale)), seeds: perSeed.map(x => r4(median(f(x).map(v => v * scale)))) });
  simDist.stepM30 = pooled(x => x.stepM); simDist.stepR30 = pooled(x => x.stepR); simDist.turn30 = pooled(x => x.turn);
  sim = {
    status: cache.key.simCodeHash === currentSim ? 'measured' : 'measured on older sim code',
    source: SIM, generated: statSync(rel(SIM)).mtime.toISOString(), simCodeHash: cache.key.simCodeHash, currentSimCodeHash: currentSim, seeds: cache.key.seeds, yearsSampled: cache.key.years, burnInDays: cache.key.burnInDays,
    at30: { stepM: row(x => x.stepM), stepR: row(x => x.stepR), turn: row(x => x.turn), straight: row(x => x.straight), pathRate: row(x => x.rate), dailyPathKm: row(x => x.pathM, 1e-3), dailyPathR: row(x => x.pathR), displacementKm: row(x => x.netM, 1e-3), displacementR: row(x => x.netR),
      follows: perSeed.reduce((a, x) => a + x.follows, 0), fullDayFollows: perSeed.reduce((a, x) => a + x.fullDays, 0) },
    at15: 'pending: the cached simulated follows copy the Taï 30-min schedule; 15-min simulated follows need a new compare-movement run',
    note: 'Simulated follows copy Taï group-day schedules (focal sex and record times), so their spans and gaps follow Taï, not Gombe. Full-day rules are the same on every side (≥ 8 h, no gap > 1 h).',
  };
  void seeds;
}

// ---------------------------------------------------------------------------------------------- output
const bins = 40, dens = (v: number[], lo: number, hi: number) => (v.length ? histogram(v, lo, hi, bins).density.map(r4) : null);
const out = {
  title: 'Gombe 15-min focal paths (second real site for path metrics)',
  generated: new Date().toISOString(), script: 'scripts/compare-gombe-paths.ts', role: 'C12 comparison metrics, held out: reported, never tuned against.',
  attribution: 'Real data: Pusey AE, Schroepfer-Walker K (2013) Female competition in chimpanzees. Phil Trans R Soc B 368: 20130077. Data: Dryad doi:10.5061/dryad.jg05d, CC0. Kasekela community, Gombe National Park, Tanzania, 2000–2003 (eastern chimpanzees). Derived statistics by MGOGO; not endorsed by the authors.',
  privacy: 'No coordinates, dates finer than a year, or identities: step lengths, angles, ratios, distances in range radii and rank-class aggregates only.',
  real: {
    site: 'Gombe Kasekela', years: report.years, rows: report.rows, followDays: report.dates, follows: report.follows, datesWithSeveralFollows: report.datesWithSeveralFollows, missingSequence: report.missingSequence,
    range: { method: `95% kernel of all 15-min records, bandwidth at the Taï h/r ${k}`, bandwidthM: Math.round(range.h), rKm: r4(range.r / 1000), areaKm2: r4(range.area95 / 1e6), byYear },
    at15: summary(g15), at30: summary(g30),
    notes: [
      't is time since the follow\'s first record (the file has no clock times), so no time-of-day profile is possible.',
      `${Math.round((g15.zeroShare) * 100)}% of 15-min steps are exactly 0 m: positions repeat while the focal stays put (1-m resolution).`,
      'The 30-min statistics use every second record from the first, the resolution of the Taï and simulated follows.',
      'The file has no focal identity or sex column, so males and females are pooled.',
    ],
  },
  sim,
  distributions: {
    stepM30: { lo: 0, hi: 800, bins, gombe: dens(g30.stepM, 0, 800), sim: dens(simDist.stepM30, 0, 800) },
    stepR30: { lo: 0, hi: 0.4, bins, gombe: dens(g30.stepR, 0, 0.4), sim: dens(simDist.stepR30, 0, 0.4) },
    turn30: { lo: 0, hi: r4(Math.PI), bins, gombe: dens(g30.turn, 0, Math.PI), sim: dens(simDist.turn30, 0, Math.PI) },
    stepM15: { lo: 0, hi: 400, bins, gombe: dens(g15.stepM, 0, 400), sim: null },
  },
  femaleCores: {
    method: 'AlonePoints (first daily position of each female seen alone). 50% core per female: the half of her points nearest their mean, convex hull (the source used BIOTAS 50% MCPs; its peeling rule is not stated). Area as a share of the community range (π r²), equal-area radius and core-centre distance from the range centre in r. Females with ≥ 10 points.',
    byRank: (['H', 'M', 'L'] as const).map(rank => { const c = cores.filter(x => x.rank === rank); return { rank, females: c.length, points: c.reduce((a, x) => a + x.points, 0), areaFrac: q(c.map(x => x.areaFrac)), radiusR: q(c.map(x => x.radiusR)), centreDistR: q(c.map(x => x.centreDistR)), values: c.map(x => ({ areaFrac: r4(x.areaFrac), centreDistR: r4(x.centreDistR) })) }; }),
    sim: 'pending: the observer does not yet record where each female is first seen alone',
  },
};
assertNonSensitive(out, new Set<string>(), ['followDays', 'rows', 'years', 'bandwidthM', 'burnInDays', 'points', 'missingSequence', 'fullDayFollows']);
mkdirSync(dirname(rel(OUT).pathname), { recursive: true });
writeFileSync(rel(OUT), JSON.stringify(out) + '\n');
const s30 = out.real.at30, s15 = out.real.at15, S = sim as { status: string; at30?: Record<string, { median: number | null; seeds: (number | null)[] }> };
console.log([
  `Gombe ${report.years.join('–')}: ${report.rows} records, ${report.dates} follow days, ${report.follows} follows (${report.datesWithSeveralFollows} days with several), ${s15.fullDayFollows} full-day follows; range r ${out.real.range.rKm} km (${out.real.range.areaKm2} km², h ${out.real.range.bandwidthM} m).`,
  `15 min: step median ${s15.stepM.median} m (p90 ${s15.stepM.p90}; zero ${s15.zeroStepShare}), turn ${s15.turn.median} rad (n ${s15.turn.n}), straightness ${s15.straight.median}, path ${s15.pathRate?.median} m/h, daily path ${s15.dailyPathKm.median} km (${s15.dailyPathR.median} r), displacement ${s15.displacementKm.median} km (${s15.displacementR.median} r).`,
  `30 min: step median ${s30.stepM.median} m (${s30.stepR.median} r), turn ${s30.turn.median} rad, straightness ${s30.straight.median}, path ${s30.pathRate?.median} m/h, daily path ${s30.dailyPathKm.median} km (${s30.dailyPathR.median} r), displacement ${s30.displacementKm.median} km.`,
  `Sim: ${S.status}${S.at30 ? `; 30 min step ${S.at30.stepM.median} m, turn ${S.at30.turn.median}, straightness ${S.at30.straight.median}, path ${S.at30.pathRate.median} m/h, daily path ${S.at30.dailyPathKm.median} km` : ''}.`,
  `Female cores: ${out.femaleCores.byRank.map(b => `${b.rank} ${b.females} females, area ${b.areaFrac.median} of range, centre ${b.centreDistR.median} r`).join('; ')}.`,
].join('\n'));
