// Real vs simulated boundary patrols and territory change (realism C6 patrol corrections, docs/realism-design.md §5.3.1;
// guide section on real vs simulated patrols and territory). Real side: open field data, parsed here; simulated
// side: read from the patrol proof's field-metrics and scenario outputs when they exist (this script never runs the sim).
//
//   pnpm exec tsx scripts/compare-patrols.ts [--B 10000] [--out docs/data/patrol-compare.json]
//        [--fresh artifacts/validation/patrol/fresh-field10y.json] [--proof artifacts/validation/patrol/proof-field1y.json]
//        [--scenario artifacts/validation/patrol/scenario]
//
// Real data (all in data/raw/, never copied out; only derived statistics are written):
//   Ngogo patrols 1996–2015: Langergraber KE, Watts DP, Vigilant L, Mitani JC (2017) PNAS 114: 7337–7342, Dryad
//     doi:10.5061/dryad.kk33f (CC0).
//   Gombe patrols and periphery visits 1978–2007: Massaro A, Gilby IC, Desai N, Weiss A, Feldblum JT, Pusey AE, Wilson ML
//     (2022) Phil Trans R Soc B 377: 20210151, Dryad doi:10.5061/dryad.z8w9ghxdb (CC0).
//   Ngogo after the fission 2016–2024: Sandel A, Mitani J, Langergraber K et al. (2026) Science, Dryad
//     doi:10.5061/dryad.sf7m0cgkg (CC0).
//   Ngogo phenology 1998–2017: Potts KB, Watts DP, Langergraber KE, Mitani JC (2020) Biotropica, Dryad
//     doi:10.5061/dryad.gf1vhhmk8 (CC0).
//   Taï border stops 2013–2016: Lemoine S, Samuni L, Crockford C, Wittig RM (2023) PLOS Biol 21: e3002350, S3 Data (CC BY 4.0).
//
// Pre-registered bands (§5.3.1 P5). T-PAT-8 and T-BRD-1 were frozen by scripts/patrol-bands-metrics.ts before this
// script existed; this script recomputes both independently from the raw files and the §5.3.1 text, then reports any
// disagreement. The frozen values stay the published bands. Ruling of 2026-09-29: T-PAT-8 is not scorable (the Ngogo
// patrol record carries no observation effort, so months without a patrol are mostly months nobody observed).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import {
  advanceByAdults, borderStops, brd1Band, csvRecords, excursionSummary, gombeExcursions, gombeParticipation, monthIndex, monthLabel, monthlyFruit,
  ngogoPatrols, ngogoSummary, patrolFruitBand, patrolMonths, postFission, readXlsx, seedOf, stopDistancesR, type Workbook,
} from '../src/compare/patrols';
import { assertNonSensitive } from '../src/compare/report';
import { records, type Cell } from '../src/compare/xlsx';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const B = +flag('B', '10000'), OUT = flag('out', 'docs/data/patrol-compare.json');
const FRESH = flag('fresh', 'artifacts/validation/patrol/fresh-field10y.json'), PROOF = flag('proof', 'artifacts/validation/patrol/proof-field1y.json');
const SCEN = flag('scenario', 'artifacts/validation/patrol/scenario'), FROZEN = 'artifacts/validation/patrol/bands.json';
const root = new URL('../', import.meta.url), rel = (p: string) => new URL(p, root);
const book = (file: string): Workbook => readXlsx(readFileSync(rel(file)), b => inflateRawSync(b));
const firstSheet = (file: string) => { const b = book(file); return records(b.sheet(b.names[0])); };
const csv = (file: string) => csvRecords(readFileSync(rel(file), 'utf8'));
const r4 = (v: number | null | undefined) => (v !== null && v !== undefined && Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : null);
const r3 = (v: number | null | undefined) => (v !== null && v !== undefined && Number.isFinite(v) ? Math.round(v * 1e3) / 1e3 : null);
const readJson = (p: string) => (existsSync(rel(p)) ? JSON.parse(readFileSync(rel(p), 'utf8')) : null);

// Observation effort of the Ngogo record: 284 patrols over 2,621 days (Langergraber et al. 2017, as read in full text for
// docs/patrol-evidence.md; the targets' "~1 per 9.2 d" is 2,621 / 284). The file itself has no effort column.
const NGOGO_EFFORT_DAYS = 2621;

// ---------------------------------------------------------------------------------------------- real: Ngogo
const kkBook = book('data/raw/dryad-kk33f/Patrol+data.xlsx');
const kkRecs = records(kkBook.sheet('data'));
const ngogo = ngogoPatrols(kkRecs), ng = ngogoSummary(ngogo, NGOGO_EFFORT_DAYS);
const names = new Set<string>(kkRecs.map(r => String(r.Male)));

// ---------------------------------------------------------------------------------------------- real: Gombe
const G = 'data/raw/dryad-z8w9ghxdb/';
const gEx = gombeExcursions(firstSheet(`${G}PatrolsandPeriph.xlsx`)), ppdata = firstSheet(`${G}PPdata.xlsx`), whole = firstSheet(`${G}WholeStudyPatrolRate.xlsx`);
const gYears: [number, number] = [Math.min(...gEx.map(e => e.year)), Math.max(...gEx.map(e => e.year))];
const gombe = { ...excursionSummary(gEx, gYears), participation: gombeParticipation(ppdata, whole) };
for (const r of [...ppdata, ...whole]) names.add(String(r.Individual));

// ---------------------------------------------------------------------------------------------- real: after the fission
const F = 'data/raw/dryad-sf7m0cgkg/';
const fission = postFission(csv(`${F}patrol-data-quarterly.csv`), csv(`${F}population_snapshots.csv`));
const preFission = ng.perYear.filter(y => y.year >= 1997 && y.year <= 2015);

// ---------------------------------------------------------------------------------------------- real: phenology + T-PAT-8
const fruit = monthlyFruit(csv('data/raw/dryad-gf1vhhmk8/phenology_file_Jan2020.csv'));
// Mean ripe fruit score by calendar month, relative to the mean over all months (1 = an average month).
const rfsAll = [...fruit.values()].reduce((a, x) => a + x, 0) / fruit.size;
const rfsByMonth = Array.from({ length: 12 }, (_, m) => { const v = [...fruit].filter(([k]) => k % 12 === m).map(([, x]) => x); return r4(v.reduce((a, x) => a + x, 0) / v.length / rfsAll); });
const dates = ngogo.patrols.map(p => p.date);
const span: [number, number] = [monthIndex([...dates].sort()[0]), monthIndex([...dates].sort()[dates.length - 1])];
const months = patrolMonths(dates, fruit, span);
const pat8 = patrolFruitBand(months, B, seedOf('T-PAT-8'));

// ---------------------------------------------------------------------------------------------- real: Taï border stops + T-BRD-1
const s3 = records(book('data/raw/plos-pbio-3002350/journal.pbio.3002350.s017.xlsx').sheet(book('data/raw/plos-pbio-3002350/journal.pbio.3002350.s017.xlsx').names[0]));
for (const r of s3) for (const t of String(r.target ?? '').split('-')) if (t) names.add(t);
const stops = borderStops(s3), brd1 = brd1Band(stops, B, seedOf('T-BRD-1'));
const move = readJson('docs/data/movement-compare.json');
const taiR = move?.provenance?.real?.territoryRadiusKm as Record<string, number> | undefined;
const rOf = (g: string) => (taiR ? (taiR[g === 'E' ? 'East' : g === 'S' ? 'South' : g] ?? NaN) * 1000 : NaN);
const stopWhere = taiR ? stopDistancesR(stops, rOf) : null;
const byAdults = advanceByAdults(stops, [[0, 3], [3, 6], [6, 10], [10, Infinity]]);

// ---------------------------------------------------------------------------------------------- frozen bands vs independent
const frozen = readJson(FROZEN), targets = readJson('data/targets.json');
const target = (id: string) => (targets?.targets as { id: string; accept?: { lo: number | null; hi: number | null; units: string; basis: string }; role: string; encoded?: boolean; tuned?: string; revisedPostFreeze?: string; notes?: string }[] | undefined)?.find(t => t.id === id);
const fz8 = frozen?.['T-PAT-8'], fzB = frozen?.['T-BRD-1'];
const agree = (a: number | null | undefined, b: number | null | undefined, tol: number) => (a == null || b == null ? null : Math.abs(a - b) <= tol);
const tpat8 = {
  id: 'T-PAT-8', status: 'not comparable yet',
  statusReason: 'The Ngogo patrol record has no observation effort, so months without a patrol are mostly months nobody observed. Ruling of 2026-09-29: not scorable; no sim-vs-real verdict is given.',
  rule: '§5.3.1 P5: Spearman ρ between monthly patrol rate (Dryad kk33f patrol dates) and monthly fruit availability (the Potts et al. 2020 site series, ripe fruit score), bootstrap 90% CI over months; band = that CI.',
  frozen: fz8 ? { rho: fz8.rho, band: fz8.band, months: fz8.months, patrols: fz8.patrolsInSpan, monthsWithoutPatrol: fz8.monthsWithoutPatrol, rate: 'patrols per 30 days', replicates: frozen.replicates, seed: frozen.seed, generated: frozen.generated, script: 'scripts/patrol-bands-metrics.ts' } : null,
  frozenTarget: target('T-PAT-8')?.accept ?? null,
  independent: { rho: r4(pat8.rho), band: [r4(pat8.lo), r4(pat8.hi)], months: pat8.months, patrols: pat8.patrols, monthsWithoutPatrol: pat8.monthsWithoutPatrol, span: [monthLabel(span[0]), monthLabel(span[1])],
    rate: 'patrols per calendar month (count)', replicates: pat8.replicates, seed: seedOf('T-PAT-8'), method: 'percentile bootstrap, months resampled with replacement; Spearman ρ on average ranks' },
  sensitivity: { rhoPer30Days: r4(pat8.rhoPer30Days), monthsWithPatrol: pat8.monthsWithPatrol, rhoMonthsWithPatrol: r4(pat8.rhoMonthsWithPatrol), junJulShare: ng.dates.junJulShare, longestGapDays: ng.dates.longestGapDays, gapsOver250Days: ng.dates.gapsOver250Days,
    effortDays: NGOGO_EFFORT_DAYS, calendarDays: Math.round((Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86400000) },
  agreement: fz8 ? {
    rho: agree(pat8.rho, fz8.rho, 0.01), band: agree(pat8.lo, fz8.band[0], 0.02) && agree(pat8.hi, fz8.band[1], 0.02), months: pat8.months === fz8.months, patrols: pat8.patrols === fz8.patrolsInSpan,
    note: `Same 211 months and 279 patrols. ρ ${r3(pat8.rho)} (counts) vs frozen ${fz8.rho} (per 30 days): the only difference is the rate definition, since dividing by month length reorders tied counts (per-30-day ρ here ${r3(pat8.rhoPer30Days)}). Band edges differ by that and by bootstrap noise (${B} vs ${frozen.replicates} replicates, different seeds).`,
  } : null,
};
const tbrd1 = {
  id: 'T-BRD-1', status: 'held out; the share is partly encoded',
  rule: '§5.3.1 P5: the share of border stops followed by an advance toward the rivals, and its slope on the number of males present. The male-count slope is the non-circular part; the share is partly encoded through patrolIncursionP.',
  unsupported: 'S3 Data do not count males: "adult party size" counts all adults of both sexes within visibility (Lemoine et al. 2023 methods). The male-count slope cannot be computed; the slope on adults present is the logged substitute (realism-design.md §5.3.1 implementation notes), and the sim must count adults the same way.',
  frozen: fzB ? { share: fzB.share, shareBand: fzB.shareBand, slope: fzB.slopePerAdult, band: fzB.slopeBand, stops: fzB.stops, groupDays: fzB.groupDays, replicates: frozen.replicates, seed: frozen.seed, generated: frozen.generated, script: 'scripts/patrol-bands-metrics.ts' } : null,
  frozenTarget: target('T-BRD-1')?.accept ?? null,
  independent: { share: r4(brd1.share), shareBand: [r4(brd1.shareLo), r4(brd1.shareHi)], slope: r4(brd1.slope), band: [r4(brd1.slopeLo), r4(brd1.slopeHi)], stops: brd1.stops, groupDays: brd1.groupDays, groups: brd1.groups, replicates: brd1.replicates, droppedReplicates: brd1.dropped, seed: seedOf('T-BRD-1'),
    method: 'logistic regression (Newton–Raphson) of approach rivals (0/1) on adult party size; percentile 90% cluster bootstrap over group-days (dates nested in groups, as the article models them)', rowBootstrap: Object.fromEntries(Object.entries(brd1.rowBootstrap).map(([k, v]) => [k, r4(v)])) },
  agreement: fzB ? {
    share: agree(brd1.share, fzB.share, 0.001), slope: agree(brd1.slope, fzB.slopePerAdult, 0.001), band: agree(brd1.slopeLo, fzB.slopeBand[0], 0.01) && agree(brd1.slopeHi, fzB.slopeBand[1], 0.01),
    note: `Same 625 stops and 283 group-days. Share ${r3(brd1.share)} and slope ${r3(brd1.slope)} match the frozen values; the interval edges differ only by bootstrap noise (${B} vs ${frozen.replicates} replicates, different seeds).`,
  } : null,
  byAdults, where: stopWhere,
  dataNotes: `${stops.filter(s => s.minutes < 5).length} of ${stops.length} rows have 'time spent' under 5 min although the article selects stops of ≥ 5 min; the column may measure something else, so no row is dropped. ${stops.filter(s => s.hill).length} hill stops, ${stops.filter(s => !s.hill).length} low-place stops.`,
};

// ---------------------------------------------------------------------------------------------- simulated side (read only)
interface SimRow { id: string; mean: number | null; min: number | null; max: number | null; perSeed?: (number | null)[]; verdict: string; band: string; parts?: Record<string, number>; n: number; flags?: string[]; note?: string; units?: string }
const simFile = (p: string) => { const j = readJson(p); return j ? { path: p, date: j.manifest?.date ?? null, seeds: j.manifest?.seeds ?? [], days: j.manifest?.days ?? null, years: j.manifest?.years ?? null, rows: j.rows as SimRow[] } : null; };
const fresh = simFile(FRESH), proof = simFile(PROOF);
const PENDING = 'pending (patrol proof not run yet)';
/** Fitted targets are checked on the proof seeds, then replicated on fresh seeds; everything else counts only on fresh seeds. */
function sim(id: string, part?: string) {
  const fitted = target(id)?.role === 'fitted', order = fitted ? [proof, fresh] : [fresh];
  for (const f of order) {
    const row = f?.rows.find(r => r.id === id);
    if (!f || !row) continue;
    const value = part ? row.parts?.[part] ?? null : row.mean;
    if (value === null || value === undefined || !Number.isFinite(value)) continue;
    const rep = fitted && f === proof ? fresh?.rows.find(r => r.id === id) : undefined;
    return { status: 'measured', value: r4(value), min: part ? null : r4(row.min), max: part ? null : r4(row.max), verdict: part ? null : row.verdict, n: row.n, flags: row.flags ?? [], note: row.note ?? '', parts: row.parts ?? {},
      file: f.path, seeds: f.seeds, date: f.date, replication: rep && Number.isFinite(rep.mean ?? NaN) ? { value: r4(rep.mean), verdict: rep.verdict, seeds: fresh!.seeds } : null };
  }
  return { status: PENDING, value: null };
}

// Expansion scenario (T-LET-4) from field-scenario.ts output, scored like that script: West's area change from year 1 to
// the last year, relative to the paired baseline of the same seed; counted only after lethal wins.
function expansionSim() {
  if (!existsSync(rel(SCEN))) return { status: PENDING };
  const files = readdirSync(rel(SCEN)).filter(f => /^expansion-summary.*\.json$/.test(f)).sort();
  if (!files.length) return { status: PENDING };
  type Year = { area: Record<string, number>; center: Record<string, [number, number]>; killings: number };
  const res: { seed: number; kind: string; years: Year[] }[] = files.flatMap(f => JSON.parse(readFileSync(rel(`${SCEN}/${f}`), 'utf8')).results);
  const seeds = [...new Set(res.filter(r => r.kind === 'expansion').map(r => r.seed))].sort((a, b) => a - b);
  const per = seeds.map(seed => {
    const b = res.find(r => r.kind === 'baseline' && r.seed === seed), e = res.find(r => r.kind === 'expansion' && r.seed === seed);
    if (!b || !e) return null;
    const e1 = e.years[0], eN = e.years[e.years.length - 1], gain = eN.area['1'] / e1.area['1'] - 1, base = b.years[b.years.length - 1].area['1'] / b.years[0].area['1'] - 1;
    const nb = ['2', '3'].map(id => e1.center[id]), mx = (nb[0][0] + nb[1][0]) / 2, mz = (nb[0][1] + nb[1][1]) / 2, dx = mx - e1.center['1'][0], dz = mz - e1.center['1'][1], l = Math.hypot(dx, dz) || 1;
    const shift = ((eN.center['1'][0] - e1.center['1'][0]) * dx + (eN.center['1'][1] - e1.center['1'][1]) * dz) / l, r = Math.sqrt(e1.area['1'] * 1e6 / Math.PI);
    const relGain = (1 + gain) / (1 + base) - 1;
    return { seed, gain: r4(gain), baseline: r4(base), relative: r4(relGain), km2: r4(eN.area['1'] - e1.area['1']), shiftR: r4(shift / r), killings: eN.killings, tested: eN.killings > 0, inBand: eN.killings > 0 && relGain >= 0.1 && relGain <= 0.35 && shift > 0 };
  }).filter(x => x !== null);
  const tested = per.filter(p => p.tested), rels = tested.map(p => p.relative!).sort((a, b) => a - b);
  return { status: 'measured', files: files.map(f => `${SCEN}/${f}`), seeds: per, testedSeeds: tested.length, inBand: tested.filter(p => p.inBand).length, medianRelative: rels.length ? r4(rels[Math.floor((rels.length - 1) / 2)] / 2 + rels[Math.ceil((rels.length - 1) / 2)] / 2) : null };
}

// ---------------------------------------------------------------------------------------------- the real-vs-sim table
type RealCell = { site: string; value: number | null; text: string; source: string; open: boolean };
const band = (id: string) => { const t = target(id); return t?.accept ? { lo: t.accept.lo, hi: t.accept.hi, units: t.accept.units, basis: t.accept.basis } : null; };
const labels = (id: string) => { const t = target(id), out: string[] = [t?.role ?? 'held-out']; if (t?.tuned) out.push('tuned'); if (t?.encoded) out.push('encoded'); if (t?.revisedPostFreeze) out.push('model revised post-freeze'); return out; };
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
const g = gombe, gp = gombe.participation;
const table = [
  { id: 'T-PAT-1', label: 'Patrols per week', unit: 'per week', band: band('T-PAT-1'), labels: labels('T-PAT-1'),
    real: [
      { site: 'Ngogo', value: ng.perObservedWeek, text: `${ng.perObservedWeek?.toFixed(2)} per observed week`, source: `${ng.patrols} patrols over ${NGOGO_EFFORT_DAYS.toLocaleString('en')} observation days reported by Langergraber et al. 2017; 24–44 males`, open: true },
      { site: 'Gombe', value: g.patrol.perWeek, text: `${g.patrol.perWeek?.toFixed(2)} per week`, source: `${g.patrol.n} patrols seen on daily focal follows, ${gYears[0]}–${gYears[1]}: a lower bound; annual median ${g.patrol.annual.median}`, open: true },
    ] as RealCell[], paper: 'Ngogo 0.72 per week in 1998–99 (Watts & Mitani 2001); Gombe and Taï North about 0.3 (as cited there).', sim: sim('T-PAT-1') },
  { id: 'T-PAT-2', label: 'Patrols per male per year', unit: 'per male-year', band: band('T-PAT-2'), labels: labels('T-PAT-2'),
    real: [
      { site: 'Ngogo', value: ng.perMaleYear.median, text: `${ng.perMaleYear.median} (median male-year)`, source: `observed patrols only (${ng.perMaleYear.n} male-years; observation stopped for months some years, so a lower bound); males joined ${pct(ng.participation.meanAllMales)} of their patrol opportunities on average`, open: true },
      { site: 'Gombe', value: gp.perMaleYear.median, text: `${gp.perMaleYear.median} (median male-year)`, source: `patrols seen on focal follows (${gp.perMaleYear.n} male-years with an opportunity); males joined ${pct(gp.participationWholeStudy.mean)} of opportunities over the study`, open: true },
    ] as RealCell[], paper: 'Ngogo 14.2, Gombe 14.4, Taï ~10 per male per year (Watts & Mitani 2001).', sim: sim('T-PAT-2') },
  { id: 'T-PAT-3', label: "Share of the community's males on a patrol", unit: 'fraction', band: band('T-PAT-3'), labels: labels('T-PAT-3'),
    real: [
      { site: 'Ngogo', value: ng.shareOfListedMales.mean, text: `${pct(ng.shareOfListedMales.mean)} (median ${ng.malesPerPatrol.median} males)`, source: `mean over ${ng.patrols} patrols; males ${ng.malesPerPatrol.min}–${ng.malesPerPatrol.max} per patrol; a community far larger than the simulated communities`, open: true },
      { site: 'Gombe', value: gp.participationWholeStudy.mean, text: `${pct(gp.participationWholeStudy.mean)} (median ${g.patrol.males.median} males)`, source: `share of patrol opportunities each male joined, mean over ${gp.participationWholeStudy.n} males (Massaro et al. report 74.5%); community of about ${Math.round(gp.communityMalesPerYear.median ?? NaN)} adult males`, open: true },
    ] as RealCell[], paper: 'Taï 72% of males per patrol (Boesch & Boesch-Achermann 2000, as cited by Watts & Mitani 2001).', sim: sim('T-PAT-3') },
  { id: 'females', label: 'Females on patrols', unit: 'share of patrols', band: null, labels: ['reported'],
    real: [
      { site: 'Ngogo', value: null, text: 'not in the open file', source: 'the file lists males only; Watts & Mitani 2001 describe females as essentially absent', open: false },
      { site: 'Gombe', value: g.patrol.withFemales, text: `${pct(g.patrol.withFemales)} of patrols (median ${g.patrol.females.median})`, source: `adult females per patrol ${g.patrol.females.min}–${g.patrol.females.max}; swollen females median ${g.patrol.swollen.median}`, open: true },
    ] as RealCell[], paper: 'Taï: adult females on 57% of patrols (as cited by Watts & Mitani 2001). Female participation is a site setting in the sim (Ngogo default).', sim: { status: 'not measured by the observer yet', value: null } },
  { id: 'T-PAT-5', label: 'Patrol duration', unit: 'min', band: band('T-PAT-5'), labels: labels('T-PAT-5'),
    real: [
      { site: 'Ngogo', value: 134, text: '134 min', source: 'Amsler 2010, 29 patrols; 2.13 ± 1.01 h over 72 patrols (Mitani & Watts 2005)', open: false },
      { site: 'Gombe', value: g.patrol.minutes.median, text: `${Math.round(g.patrol.minutes.median ?? NaN)} min (median)`, source: `${g.patrol.n} patrols, ${Math.round(g.patrol.minutes.min ?? NaN)}–${Math.round(g.patrol.minutes.max ?? NaN)} min`, open: true },
    ] as RealCell[], paper: '', sim: sim('T-PAT-5') },
  { id: 'T-PAT-5-km', label: 'Patrol distance', unit: 'km', band: { lo: 1, hi: 4, units: 'km', basis: 'T-PAT-5 distance part' }, labels: labels('T-PAT-5'),
    real: [
      { site: 'Ngogo', value: 2.456, text: '2.5 km', source: 'Amsler 2010: 2,456 m, SD 1,492. No open track data exist', open: false },
      { site: 'Taï', value: 2.45, text: '2.4–2.5 km', source: 'Lemoine et al. 2023: South 2,500 ± 2,300 m, East 2,400 ± 1,725 m', open: false },
    ] as RealCell[], paper: '', sim: sim('T-PAT-5', 'km') },
  { id: 'T-PAT-6', label: "Patrols that enter a neighbour's range", unit: 'fraction', band: band('T-PAT-6'), labels: labels('T-PAT-6'),
    real: [{ site: 'Ngogo', value: 0.58, text: '58%', source: 'Mitani & Watts 2005: 42 of 72 patrols', open: false }] as RealCell[], paper: '', sim: sim('T-PAT-6') },
  { id: 'T-PAT-7', label: 'Patrols that meet neighbours', unit: 'fraction', band: band('T-PAT-7'), labels: labels('T-PAT-7'),
    real: [{ site: 'Ngogo', value: 0.32, text: '32%; physical aggression on 13%', source: 'Watts et al. 2006: contact on 30 of 95 patrols, physical aggression on 12; Watts & Mitani 2001: 19 of 52', open: false }] as RealCell[], paper: '', sim: sim('T-PAT-7') },
  { id: 'T-LET-6', label: 'Killings made on patrol', unit: 'fraction', band: band('T-LET-6'), labels: labels('T-LET-6'),
    real: [{ site: 'Ngogo', value: 17 / 18, text: '17 of 18', source: 'Mitani et al. 2010, 1999–2008', open: false }] as RealCell[], paper: '', sim: sim('T-LET-6') },
];

// ---------------------------------------------------------------------------------------------- output
const exp = expansionSim();
const out = {
  title: 'Real vs simulated boundary patrols and territory change',
  generated: new Date().toISOString(), script: 'scripts/compare-patrols.ts',
  proof: { status: fresh || proof ? 'partial or complete' : PENDING, fresh: fresh ? { path: fresh.path, date: fresh.date, seeds: fresh.seeds, years: fresh.years, days: fresh.days } : null, proof: proof ? { path: proof.path, date: proof.date, seeds: proof.seeds, days: proof.days } : null },
  table,
  bands: { 'T-PAT-8': tpat8, 'T-BRD-1': { ...tbrd1, band: band('T-BRD-1'), labels: labels('T-BRD-1'), sim: sim('T-BRD-1') } },
  check: { id: 'T-PAT-9', label: 'Patrol sector concentration', note: 'Encoded-descriptive check (Amendment A was chosen after reading this pattern): reported, never counted as validation. Real pattern: repeat patrols on contested edges and months of neglect elsewhere (Watts & Mitani 2001: one sector patrolled 20 times in 11 months, another 158 days without a patrol).', band: band('T-PAT-9'), sim: sim('T-PAT-9') },
  compromised: { id: 'T-PAT-4', note: 'Patrol predictors: compromised this cycle (P1 changed its predictor after its value was seen). Reported, never counted, nothing tuned against it.' },
  ngogo: { ...ng, dates: { ...ng.dates, first: ng.dates.first?.slice(0, 7), last: ng.dates.last?.slice(0, 7) } },
  gombe,
  fission: { ...fission, preFission: { source: 'Dryad kk33f (observed patrols; effort varies by year)', perYear: preFission, meanPerYear: r4(preFission.reduce((a, y) => a + y.n, 0) / Math.max(1, preFission.length)),
    per10MaleYears: r4(preFission.reduce((a, y) => a + y.n, 0) / preFission.reduce((a, y) => a + (fission.malesByYear.find(m => m.community === 'Ngogo' && m.year === y.year)?.n ?? NaN), 0) * 10) } },
  seasonality: { months: Array.from({ length: 12 }, (_, i) => i + 1), ngogoPatrols: ng.dates.byMonth, gombePatrols: g.patrol.byMonth, gombePeriph: g.periph.byMonth, ngogoRFSRelative: rfsByMonth, fruitMonths: fruit.size, sim: null,
    note: 'Ngogo patrols by calendar month mix behaviour with the observers\' field seasons (43% fall in June–July); Gombe patrols come from year-round daily focal follows.' },
  expansion: {
    real: { site: 'Ngogo', gainKm2: 6.4, gainShare: 0.223, before: 28.76, after: 35.16, killings: 21, killingsNE: 13, years: '1999–2009', source: 'Mitani, Watts & Amsler 2010 (Curr Biol); areas from Langergraber et al. 2017' },
    band: band('T-LET-4'), labels: [...labels('T-LET-4'), 'partially encoded (scored against the paired baseline)'],
    rule: "field-scenario.ts expansion: West gets 6 extra adult males; its 95% range area change from year 1 to year 10, relative to the same seed's baseline, counted only after lethal wins; the centre must shift toward the neighbours.",
    sim: exp,
  },
  notComparable: [
    'Patrol routes: no open patrol tracks exist for any site, so route shape, speed and where patrols turn back cannot be compared.',
    'T-PAT-8 (patrols vs fruit): the Ngogo record has no observation effort; months without a patrol are mostly unobserved.',
    'The male-count slope of T-BRD-1: the Taï data count adults of both sexes, not males.',
    'Female participation at Ngogo and patrol distance anywhere: only published summaries exist, no open records.',
    'Incursion depth and the location of killings: published as maps only (not copied) or as single numbers.',
  ],
  attribution: [
    { data: 'Ngogo patrols 1996–2015', text: 'Langergraber KE, Watts DP, Vigilant L, Mitani JC (2017) Group augmentation, collective action, and territorial boundary patrols by male chimpanzees. PNAS 114: 7337–7342. Data: Dryad doi:10.5061/dryad.kk33f, CC0.', licence: 'CC0' },
    { data: 'Gombe patrols and periphery visits 1978–2007', text: 'Massaro A, Gilby IC, Desai N, Weiss A, Feldblum JT, Pusey AE, Wilson ML (2022) Correlates of individual participation in boundary patrols by male chimpanzees. Phil Trans R Soc B 377: 20210151. Data: Dryad doi:10.5061/dryad.z8w9ghxdb, CC0.', licence: 'CC0' },
    { data: 'Ngogo after the fission 2016–2024', text: 'Sandel A, Mitani J, Langergraber K et al. (2026) Lethal conflict after group fission in wild chimpanzees. Science. Data: Dryad doi:10.5061/dryad.sf7m0cgkg, CC0.', licence: 'CC0' },
    { data: 'Ngogo phenology 1998–2017', text: 'Potts KB, Watts DP, Langergraber KE, Mitani JC (2020) Biotropica. Data: Dryad doi:10.5061/dryad.gf1vhhmk8, CC0.', licence: 'CC0' },
    { data: 'Taï border stops 2013–2016', text: 'Lemoine S, Samuni L, Crockford C, Wittig RM (2023) Chimpanzees make tactical use of high elevation in territorial contexts. PLOS Biology 21(11): e3002350, S3 Data, CC BY 4.0. Western chimpanzees (P. t. verus), not Kibale.', licence: 'CC BY 4.0' },
  ],
  privacy: 'Derived statistics only: counts, shares, rates, rank correlations, slopes and distances in range radii. No coordinates, no dates finer than a month, no individual names.',
  provenance: { B, seeds: { 'T-PAT-8': seedOf('T-PAT-8'), 'T-BRD-1': seedOf('T-BRD-1') }, frozenBands: frozen ? FROZEN : null, taiRadiiFrom: taiR ? 'docs/data/movement-compare.json (territory kernels of the Taï 30-min records)' : null },
};
// The guard checks every number and string except the citations (Ngogo male names include authors' surnames, e.g. Wilson).
assertNonSensitive({ ...out, attribution: null }, names, ['effortDays', 'calendarDays', 'replicates', 'B', 'seed', 'T-PAT-8', 'T-BRD-1', 'years']);
mkdirSync(dirname(rel(OUT).pathname), { recursive: true });
writeFileSync(rel(OUT), JSON.stringify(out) + '\n');

const md = [
  '# Real vs simulated patrols', '',
  `Ngogo: ${ng.patrols} patrols ${ng.dates.first}–${ng.dates.last}; ${ng.perObservedWeek} per observed week; ${ng.malesPerPatrol.median} males per patrol (${pct(ng.shareOfListedMales.mean)} of listed males); per male-year median ${ng.perMaleYear.median}; participation ${pct(ng.participation.meanAllMales)} (${pct(ng.participation.meanMales20)} for males with ≥ 20 opportunities); June–July share ${ng.dates.junJulShare}; ${ng.dates.gapsOver250Days} gaps > 250 d.`,
  `Gombe: ${g.patrol.n} patrols and ${g.periph.n} periphery visits ${gYears.join('–')}; patrols ${g.patrol.perWeek} per week (annual median ${g.patrol.annual.median}); duration median ${g.patrol.minutes.median} min (periphery ${g.periph.minutes.median}); males ${g.patrol.males.median} (periphery ${g.periph.males.median}), females ${g.patrol.females.median} (periphery ${g.periph.females.median}), with females ${pct(g.patrol.withFemales)}; feeding ${g.patrol.feedMinPerH.median} vs ${g.periph.feedMinPerH.median} min/h (median); participation ${pct(gp.participationWholeStudy.mean)}; per male-year ${gp.perMaleYear.median}; community adult males (median year) ${gp.communityMalesPerYear.median}.`,
  `Fission: ${fission.split.years?.join('–')} West ${fission.split.westPerYear}/y (${fission.split.westPer10MaleYears} per 10 male-years), Central ${fission.split.centralPerYear}/y (${fission.split.centralPer10MaleYears}); pre-fission Ngogo ${out.fission.preFission.meanPerYear}/y observed.`,
  '', `T-PAT-8 (not comparable yet): independent ρ ${r4(pat8.rho)} [${r4(pat8.lo)}, ${r4(pat8.hi)}], ${pat8.months} months, ${pat8.patrols} patrols; per-30-day ρ ${r4(pat8.rhoPer30Days)}; months with a patrol ${pat8.monthsWithPatrol}, ρ ${r4(pat8.rhoMonthsWithPatrol)}. Frozen: ${fz8 ? `${fz8.rho} [${fz8.band.join(', ')}]` : 'missing'}.`,
  `T-BRD-1: share ${r4(brd1.share)} [${r4(brd1.shareLo)}, ${r4(brd1.shareHi)}], slope ${r4(brd1.slope)} [${r4(brd1.slopeLo)}, ${r4(brd1.slopeHi)}] (${brd1.stops} stops, ${brd1.groupDays} group-days, ${brd1.dropped} replicates dropped). Frozen: ${fzB ? `${fzB.share}, ${fzB.slopePerAdult} [${fzB.slopeBand.join(', ')}]` : 'missing'}.`,
  `Stops from centre (r): ${stopWhere ? `median ${stopWhere.fromCentre.median} (${stopWhere.fromCentre.p10}–${stopWhere.fromCentre.p90})` : 'no Taï radii'}.`,
  `Sim: fresh ${fresh ? fresh.path : 'missing'}, proof ${proof ? proof.path : 'missing'}, scenario ${exp.status}.`, '',
].join('\n');
mkdirSync(rel('artifacts/compare-patrols/').pathname, { recursive: true });
writeFileSync(rel('artifacts/compare-patrols/summary.md'), md);
console.log(md);
