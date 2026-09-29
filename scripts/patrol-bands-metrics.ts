// Real-data bands for the C6 patrol-correction held-outs T-PAT-8 and T-BRD-1 (docs/realism-design.md §5.3.1 P5), computed
// before any simulation value of the corrected model is seen. Only derived statistics leave data/raw: counts, rank
// correlations, shares, slopes and their intervals. No dates, locations, trail-grid labels or coordinates are written.
//
//   pnpm exec tsx scripts/patrol-bands-metrics.ts [--out artifacts/validation/patrol]
//
// Rules (stated before the first run; the §5.3.1 definitions, made operational):
// T-PAT-8, patrols and fruit (Ngogo).
//   - Patrols: the distinct Patrol# of Langergraber et al. 2017 (Dryad kk33f, sheet "data"), each with its date.
//   - Fruit: the monthly ripe fruit score (RFS) of Potts et al. 2020 (Dryad gf1vhhmk8, phenology_file_Jan2020.csv), the site's
//     fruit-availability index. The share of trees with fruit in the same file is reported, not scored.
//   - Months: every calendar month from the later of the first patrol month and the first phenology month to the earlier
//     of the two last months. Months without an RFS value are dropped. Months without a recorded patrol count 0 (the patrol
//     record is continuous observation of the community over its span).
//   - Rate: patrols per 30 days (count ÷ days in the month × 30).
//   - Statistic: Spearman ρ of rate vs RFS. Band: the 5th–95th percentile of 4,000 bootstrap replicates that resample months
//     with replacement (mulberry32 seed 20260929). A 12-month moving-block bootstrap is reported as a note, not the band.
// T-BRD-1, advance after border stops (Taï S3 Data).
//   - Rows: every stop of S3 Data (≥ 5-min stops at peripheral hills or low-lying places in the territory overlap zone,
//     Lemoine et al. 2023 methods) with a coded 'approach rivals' and 'adult party size'.
//   - Advance: 'approach rivals' = 1 (subsequent movement directed toward the rivals' location), else 0.
//   - Share: mean advance. Slope: logistic regression of advance on the number of adults present ('adult party size', log-odds
//     per adult). S3 Data records adults, not males (the article counts all adults because Taï females join encounters), so
//     the male-count slope of §5.3.1 uses adults as its proxy; the simulated statistic counts adults the same way.
//   - Intervals: 5th–95th percentile of 4,000 cluster-bootstrap replicates resampling group-days (group + date) with
//     replacement (same seed). Reported, not scored: the slope on the imbalance of power (own − rival adults), which is the
//     article's own predictor.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mulberry32 } from '../src/compare/sampling';
import { records, sharedStrings, sheetRows, type Cell } from '../src/compare/xlsx';
import { logistic, mean, quantile, spearman } from '../src/field/stats';

const SEED = 20260929, B = 4000;
const PATROLS = 'data/raw/dryad-kk33f/Patrol+data.xlsx';
const PHENOLOGY = 'data/raw/dryad-gf1vhhmk8/phenology_file_Jan2020.csv';
const S3 = 'data/raw/plos-pbio-3002350/journal.pbio.3002350.s017.xlsx';

function sheet(file: string, name = 'sheet1'): Cell[][] {
  const un = (p: string) => { try { return execFileSync('unzip', ['-p', file, p], { maxBuffer: 1 << 28 }).toString('utf8'); } catch { return ''; } };
  const ss = un('xl/sharedStrings.xml');
  return sheetRows(un(`xl/worksheets/${name}.xml`), ss ? sharedStrings(ss) : []);
}

/** [year, month 1..12] of an Excel serial or an M/D/YYYY string. */
function yearMonth(v: Cell): [number, number] | null {
  if (typeof v === 'number' && Number.isFinite(v)) { const d = new Date(Math.round((v - 25569) * 86400000)); return [d.getUTCFullYear(), d.getUTCMonth() + 1]; }
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v ?? '').trim());
  return m ? [+m[3], +m[1]] : null;
}
const key = (y: number, m: number) => y * 12 + (m - 1);
const daysIn = (k: number) => new Date(Date.UTC(Math.floor(k / 12), (k % 12) + 1, 0)).getUTCDate();
const pct = (v: number[]) => [quantile(v, 0.05), quantile(v, 0.95)] as [number, number];
const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

function patrolFruit() {
  const rows = records(sheet(PATROLS));
  const byPatrol = new Map<number, number>();
  let undated = 0;
  for (const r of rows) {
    const id = Number(r['Patrol#']), ym = yearMonth(r['Date (M/D/Y)']);
    if (!Number.isFinite(id)) continue;
    if (!ym) { undated++; continue; }
    if (!byPatrol.has(id)) byPatrol.set(id, key(ym[0], ym[1]));
  }
  const perMonth = new Map<number, number>();
  for (const k of byPatrol.values()) perMonth.set(k, (perMonth.get(k) ?? 0) + 1);
  const csv = readFileSync(PHENOLOGY, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).map(l => l.split(','));
  const h = csv[0], iy = h.indexOf('year'), im = h.indexOf('NumericMonth'), ir = h.indexOf('RFS'), ip = h.indexOf('Proportion.of.trees.w.fruit');
  const fruit = new Map<number, { rfs: number; prop: number }>();
  for (const r of csv.slice(1)) { const y = +r[iy], m = +r[im], rfs = parseFloat(r[ir]), prop = parseFloat(r[ip]); if (Number.isFinite(y) && m >= 1 && m <= 12 && Number.isFinite(rfs)) fruit.set(key(y, m), { rfs, prop }); }
  const pk = [...perMonth.keys()], fk = [...fruit.keys()];
  const lo = Math.max(Math.min(...pk), Math.min(...fk)), hi = Math.min(Math.max(...pk), Math.max(...fk));
  const rate: number[] = [], rfs: number[] = [], prop: number[] = [];
  let dropped = 0, patrols = 0, zero = 0;
  for (let k = lo; k <= hi; k++) {
    const f = fruit.get(k);
    if (!f) { dropped++; continue; }
    const n = perMonth.get(k) ?? 0;
    patrols += n; if (!n) zero++;
    rate.push(n / daysIn(k) * 30); rfs.push(f.rfs); prop.push(f.prop);
  }
  const rho = spearman(rate, rfs), rng = mulberry32(SEED), boot: number[] = [], block: number[] = [], n = rate.length;
  for (let b = 0; b < B; b++) {
    const a: number[] = [], c: number[] = [];
    for (let i = 0; i < n; i++) { const j = Math.floor(rng() * n); a.push(rate[j]); c.push(rfs[j]); }
    const v = spearman(a, c); if (Number.isFinite(v)) boot.push(v);
  }
  for (let b = 0; b < B; b++) {
    const a: number[] = [], c: number[] = [];
    while (a.length < n) { const s = Math.floor(rng() * (n - 11)); for (let i = s; i < s + 12 && a.length < n; i++) { a.push(rate[i]); c.push(rfs[i]); } }
    const v = spearman(a, c); if (Number.isFinite(v)) block.push(v);
  }
  const propOk = prop.map((v, i) => [v, rate[i]] as const).filter(([v]) => Number.isFinite(v));
  return {
    patrolsInFile: byPatrol.size, undatedRows: undated, firstYear: Math.floor(lo / 12), lastYear: Math.floor(hi / 12), months: n, monthsDropped: dropped,
    patrolsInSpan: patrols, monthsWithoutPatrol: zero, meanRatePer30d: r4(mean(rate)),
    rho: r4(rho), band: pct(boot).map(r4), blockBootstrap12: pct(block).map(r4),
    rhoProportionOfTreesWithFruit: r4(spearman(propOk.map(p => p[1]), propOk.map(p => p[0]))),
  };
}

function borderStops() {
  const rows = records(sheet(S3)).map(r => ({ g: String(r['group'] ?? ''), day: String(r['new_date'] ?? ''), adv: Number(r['approach rivals']), own: Number(r['adult party size']), riv: Number(r['neighb adult party size']) }))
    .filter(r => (r.adv === 0 || r.adv === 1) && Number.isFinite(r.own));
  const fit = (rs: typeof rows, x: (r: (typeof rows)[number]) => number) => {
    const ok = rs.filter(r => Number.isFinite(x(r)));
    const L = logistic(ok.map(r => [x(r)]), ok.map(r => r.adv));
    return L.converged ? L.beta[1] : NaN;
  };
  const clusters = new Map<string, typeof rows>();
  for (const r of rows) { const k = `${r.g}|${r.day}`; (clusters.get(k) ?? clusters.set(k, []).get(k)!).push(r); }
  const cl = [...clusters.values()], rng = mulberry32(SEED ^ 0x5b3), share: number[] = [], slope: number[] = [], imb: number[] = [];
  for (let b = 0; b < B; b++) {
    const rs: typeof rows = [];
    for (let i = 0; i < cl.length; i++) rs.push(...cl[Math.floor(rng() * cl.length)]);
    share.push(mean(rs.map(r => r.adv)));
    const s = fit(rs, r => r.own); if (Number.isFinite(s)) slope.push(s);
    const t = fit(rs, r => r.own - r.riv); if (Number.isFinite(t)) imb.push(t);
  }
  const bins = [[1, 3], [4, 6], [7, 10], [11, 99]].map(([a, z]) => { const s = rows.filter(r => r.own >= a && r.own <= z); return { adults: `${a}–${z === 99 ? '' : z}`, n: s.length, advance: r4(mean(s.map(r => r.adv))) }; });
  return {
    stops: rows.length, groupDays: cl.length, groups: [...new Set(rows.map(r => r.g))].length,
    share: r4(mean(rows.map(r => r.adv))), shareBand: pct(share).map(r4),
    slopePerAdult: r4(fit(rows, r => r.own)), slopeBand: pct(slope).map(r4),
    slopeImbalance: r4(fit(rows, r => r.own - r.riv)), slopeImbalanceCI: pct(imb).map(r4),
    medianAdults: quantile(rows.map(r => r.own), 0.5), byAdults: bins,
  };
}

function main() {
  const args = process.argv.slice(2), oi = args.indexOf('--out'), out = oi >= 0 ? args[oi + 1] : 'artifacts/validation/patrol';
  const pat8 = patrolFruit(), brd1 = borderStops();
  const res = { generated: new Date().toISOString(), seed: SEED, replicates: B, 'T-PAT-8': pat8, 'T-BRD-1': brd1,
    credit: 'Langergraber KE, Watts DP, Vigilant L, Mitani JC (2017) PNAS, Dryad doi:10.5061/dryad.kk33f (CC0); Potts KB, Watts DP, Langergraber KE, Mitani JC (2020) Biotropica, Dryad doi:10.5061/dryad.gf1vhhmk8 (CC0); Lemoine S, Samuni L, Crockford C, Wittig RM (2023) PLOS Biol 21: e3002350, S3 Data (CC BY 4.0). Derived statistics by MGOGO.' };
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/bands.json`, JSON.stringify(res, null, 2) + '\n');
  const md = [
    '# Real-data bands for T-PAT-8 and T-BRD-1', '', `Computed by scripts/patrol-bands-metrics.ts before any run of the corrected model (rules in the script header). Bootstrap: ${B} replicates, seed ${SEED}.`, '',
    '## T-PAT-8: monthly patrol rate vs fruit (Ngogo)', '',
    `- Patrols in the file ${pat8.patrolsInFile}; months ${pat8.firstYear}–${pat8.lastYear}: ${pat8.months} with a fruit score (${pat8.monthsDropped} dropped), ${pat8.patrolsInSpan} patrols, ${pat8.monthsWithoutPatrol} months without one; mean ${pat8.meanRatePer30d} patrols per 30 d.`,
    `- Spearman ρ (rate vs ripe fruit score) **${pat8.rho}**, band (month bootstrap 90%) **${pat8.band[0]} to ${pat8.band[1]}**.`,
    `- Notes, not scored: 12-month block bootstrap ${pat8.blockBootstrap12[0]} to ${pat8.blockBootstrap12[1]}; ρ with the share of trees with fruit ${pat8.rhoProportionOfTreesWithFruit}.`, '',
    '## T-BRD-1: advance after border stops (Taï S3 Data)', '',
    `- ${brd1.stops} stops, ${brd1.groupDays} group-days, ${brd1.groups} groups; median adults present ${brd1.medianAdults}.`,
    `- Advance share **${brd1.share}** (90% ${brd1.shareBand[0]}–${brd1.shareBand[1]}); slope on adults present **${brd1.slopePerAdult}** log-odds per adult (90% ${brd1.slopeBand[0]} to ${brd1.slopeBand[1]}).`,
    `- Not scored: slope on the imbalance of power (own − rival adults) ${brd1.slopeImbalance} (90% ${brd1.slopeImbalanceCI[0]} to ${brd1.slopeImbalanceCI[1]}).`,
    `- Advance by adults present: ${brd1.byAdults.map(b => `${b.adults}: ${b.advance} (n ${b.n})`).join('; ')}.`, '', `Credit: ${res.credit}`, ''].join('\n');
  writeFileSync(`${out}/bands.md`, md);
  console.log(md);
}

main();
