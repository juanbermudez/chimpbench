import type { Derived } from './derive';
import type { MetricDef, SeedValue } from './metrics';
import { isoplethArea, isoplethLevels, kde, levelAt, type UdGrid } from './space';
import { clusterBootstrap, cox, linearFit, poissonGlm, type CoxRow, type Estimate } from './survival';

// Stage C8 sealed targets (docs/staging/early-life-prereg.md §1): T-DEM-14, T-DEM-15 (computed as pre-registered in
// §1.12 from its unchanged row), T-DEM-16…24, and T-LET-5 (scenario). Every definition here is sealed: the metric
// functions run only under `scripts/field-metrics.ts --unseal` (or `field-scenario.ts expansion --unseal`), which
// refuse unless the registry and protocol hashes equal the logged C8 freeze. During development nothing calls them.
//
// Shared rules (§1.2): orphan outcomes use known-age individuals (born during the observation); the mother is the
// roster's; the loss date is her carcass date, or the last sighting when she disappeared; the offspring must have been
// in her community then; transferring daughters stay in the analysis. Strata are seed × community; 90% intervals come
// from a cluster bootstrap over mothers (1,000 resamples, the observer's own seeded RNG). Where the source fitted a
// mixed model, random intercepts are fitted as strata or fixed stratum effects and the random individual effect is
// replaced by resampling individuals (an approximation stated before any value exists; logged with the C8 freeze).

export const SEALED = 'sealed (C8 proof)';
const YEAR_H = 365.25 * 24;
/** The simulation's gestation used to date conceptions (early-life-prereg §1.12). */
const GESTATION_H = 228 * 24;
const MONTH_H = 24 * 365 / 12;
const none = (note: string, n = 0): SeedValue => ({ value: null, n, note });

// ---------------------------------------------------------------------------
// Genealogy from the census
// ---------------------------------------------------------------------------

/** The community an individual belonged to at time t, from its transfers (the roster keeps the latest one). */
export function communityAt(d: Derived, id: number, t: number): number {
  const r = d.roster.get(id);
  if (!r) return -1;
  let c = -1, first = -1;
  for (const x of d.rec.transfers) {
    if (x.id !== id) continue;
    if (first < 0) first = x.from;
    if (x.tSeen <= t) c = x.to;
  }
  return c >= 0 ? c : first >= 0 ? first : r.troop;
}

export interface Loss { t: number; age: number; inCommunity: boolean }

/** The loss of an individual's mother (early-life-prereg §1.2), or null while she is alive at the end of the observation. */
export function lossOf(d: Derived, id: number): Loss | null {
  const r = d.roster.get(id);
  if (!r || r.mother <= 0) return null;
  const death = d.rec.deaths.find(x => x.id === r.mother);
  if (!death) return null;
  const t = death.how === 'body' ? death.tEst : death.last;
  return { t, age: d.ageAt(id, t), inCommunity: communityAt(d, r.mother, t - 1e-6) === communityAt(d, id, t) };
}

const deathTime = (d: Derived, id: number) => d.rec.deaths.find(x => x.id === id)?.tEst ?? null;
const stratumOf = (d: Derived, id: number) => d.rec.worldSeed * 1000 + (d.roster.get(id)?.natal ?? 0);
const clusterOf = (d: Derived, id: number) => { const m = d.roster.get(id)?.mother ?? -1; return d.rec.worldSeed * 1e6 + (m > 0 ? m : 500000 + id); };

/** Parallel arrays of Cox rows (the SeedValue raw format, pooled across seeds). */
interface CoxRaw { start: number[]; stop: number[]; event: number[]; x: number[]; stratum: number[]; cluster: number[]; sex: number[] }
const emptyCox = (): CoxRaw => ({ start: [], stop: [], event: [], x: [], stratum: [], cluster: [], sex: [] });
const joinCox = (s: SeedValue[], key = ''): CoxRaw => {
  const o = emptyCox();
  for (const v of s) for (const k of Object.keys(o) as (keyof CoxRaw)[]) o[k].push(...(v.raw?.[key + k] ?? []));
  return o;
};
const rawOf = (c: CoxRaw, key = ''): Record<string, number[]> => Object.fromEntries(Object.entries(c).map(([k, v]) => [key + k, v]));

/**
 * Time-varying orphan survival rows on the age scale (years): known-age individuals passing `keep`, at risk from
 * `entryAge`; the orphan covariate switches on at a loss in [lo, hi) while in the mother's community. Losses before
 * entry exclude the individual; a later loss (or one outside her community) censors it when `censorLater`, otherwise
 * it stays a non-orphan. `exclude` drops individuals (T-DEM-15 cohort rules).
 */
function orphanRows(d: Derived, keep: (sex: string) => boolean, entryAge: number, lo: number, hi: number, censorLater: boolean, exclude?: (id: number, loss: Loss | null) => boolean): CoxRaw {
  const o = emptyCox();
  for (const r of d.rec.roster) {
    if (!r.knownAge || !keep(r.sex)) continue;
    const dt = deathTime(d, r.id), end = Math.min(dt ?? d.t1, d.t1), died = dt !== null && dt <= d.t1 ? 1 : 0;
    const a0 = entryAge, aEnd = d.ageAt(r.id, end);
    if (!(aEnd > a0) || d.ageAt(r.id, r.firstSeen) > a0 + 1e-9) continue;
    const loss = lossOf(d, r.id);
    if (exclude?.(r.id, loss)) continue;
    if (loss && loss.t <= end && loss.age < a0) continue;
    const push = (s: number, e: number, x: number, ev: number) => { if (e > s) { o.start.push(s); o.stop.push(e); o.x.push(x); o.event.push(ev); o.stratum.push(stratumOf(d, r.id)); o.cluster.push(clusterOf(d, r.id)); o.sex.push(r.sex === 'male' ? 1 : 0); } };
    if (loss && loss.t <= end) {
      if (loss.inCommunity && loss.age >= lo && loss.age < hi) { push(a0, loss.age, 0, 0); push(loss.age, aEnd, 1, died); continue; }
      if (censorLater) { push(a0, loss.age, 0, 0); continue; }
    }
    push(a0, aEnd, 0, died);
  }
  return o;
}

const coxRows = (c: CoxRaw, idx: number[]): CoxRow[] => idx.map(i => ({ start: c.start[i], stop: c.stop[i], event: c.event[i], x: [c.x[i]], stratum: c.stratum[i] }));
const logHr = (c: CoxRaw, idx: number[]) => { const rows = coxRows(c, idx); if (!rows.some(r => r.event && r.x[0] === 1) && !rows.some(r => r.event)) return null; const f = cox(rows, 1); return f.converged ? f.beta[0] : null; };
const orphanYears = (c: CoxRaw) => c.x.reduce((a, x, i) => a + (x === 1 ? c.stop[i] - c.start[i] : 0), 0);
const orphanDeaths = (c: CoxRaw) => c.x.reduce((a, x, i) => a + (x === 1 && c.event[i] ? 1 : 0), 0);
const allIdx = (n: number) => Array.from({ length: n }, (_, i) => i);
const estParts = (name: string, e: Estimate) => ({ [name]: e.est, [`${name}Lo`]: e.lo, [`${name}Hi`]: e.hi, [`${name}Mde`]: e.mde });

// ---------------------------------------------------------------------------
// T-DEM-14: female rank and fertility (outline in §1.12; details fixed here before any value)
// ---------------------------------------------------------------------------

/**
 * High-ranking = the top third of the community's female dominance order on that day (jones2010 coded high / middle /
 * low from pant-grunts and collapsed middle and low into "not high"; its cut-off rule is UNVERIFIED, so the tertile is a
 * design rule fixed before any value).
 */
function highRanking(d: Derived, female: number, t: number): number | null {
  const day = Math.floor((t + 6.5) / 24) + 1, troop = communityAt(d, female, t);
  let best: { day: number; ids: number[] } | null = null;
  for (const f of d.rec.femaleOrder) if (f.troop === troop && f.day <= day && (!best || f.day > best.day)) best = f;
  if (!best || !best.ids.length) return null;
  const k = best.ids.indexOf(female);
  if (k < 0) return null;
  return k < best.ids.length / 3 ? 1 : 0;
}

const tDem14: MetricDef = {
  id: 'T-DEM-14', sealed: SEALED, pool: 'custom',
  protocol: 'census + Elo (sealed; §1.12 outline): stratified Cox of the interval from a birth whose infant was alive at the next birth (or at censoring: mother\'s death, run end) on "high-ranking" (top third of the female order at the interval mid-point; design), birth HR high vs not-high; infant survival to 1 y (and 5 y, a part) by the same indicator at birth; 90% cluster bootstrap over mothers; pass if the HR 90% lower bound > 1 and the survival difference 90% lower bound > 0; insufficient below 30 intervals per group (jones2010; pusey1997)',
  compute: d => {
    const iv = emptyCox(), sv = { high: [] as number[], s1: [] as number[], s5: [] as number[], cluster: [] as number[] };
    const byMother = new Map<number, typeof d.rec.births>();
    for (const b of d.rec.births) { let l = byMother.get(b.mother); if (!l) byMother.set(b.mother, l = []); l.push(b); }
    for (const [m, bs] of byMother) {
      bs.sort((a, b) => a.tSeen - b.tSeen);
      const mEnd = Math.min(deathTime(d, m) ?? d.t1, d.t1), cl = d.rec.worldSeed * 1e6 + m;
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i], next = bs[i + 1], infDeath = deathTime(d, b.id);
        const stop = next ? next.tSeen : mEnd, event = next ? 1 : 0;
        if (!(infDeath === null || infDeath > stop)) continue; // intervals after an infant's death are T-DEM-13's
        const hi = highRanking(d, m, (b.tSeen + stop) / 2);
        if (hi !== null && stop > b.tSeen) { iv.start.push(0); iv.stop.push((stop - b.tSeen) / YEAR_H); iv.event.push(event); iv.x.push(hi); iv.stratum.push(d.rec.worldSeed * 1000 + communityAt(d, m, b.tSeen)); iv.cluster.push(cl); iv.sex.push(0); }
      }
      for (const b of bs) {
        const hi = highRanking(d, m, b.tSeen), dt = deathTime(d, b.id);
        if (hi === null || b.tSeen + YEAR_H > d.t1) continue;
        sv.high.push(hi); sv.cluster.push(cl);
        sv.s1.push(dt === null || dt > b.tSeen + YEAR_H ? 1 : 0);
        sv.s5.push(b.tSeen + 5 * YEAR_H > d.t1 ? -1 : dt === null || dt > b.tSeen + 5 * YEAR_H ? 1 : 0);
      }
    }
    return { value: null, n: iv.x.length, raw: { ...rawOf(iv, 'iv'), svHigh: sv.high, svS1: sv.s1, svS5: sv.s5, svCluster: sv.cluster } };
  },
  pooled: s => {
    const iv = joinCox(s, 'iv');
    const high = s.flatMap(v => v.raw?.svHigh ?? []), s1 = s.flatMap(v => v.raw?.svS1 ?? []), s5 = s.flatMap(v => v.raw?.svS5 ?? []), cl = s.flatMap(v => v.raw?.svCluster ?? []);
    const nHigh = iv.x.filter(x => x === 1).length, nLow = iv.x.length - nHigh;
    if (nHigh < 30 || nLow < 30) return none(`${nHigh} high-ranking and ${nLow} other intervals (needs 30 each)`, iv.x.length);
    const hr = clusterBootstrap(iv.cluster, idx => logHr(iv, idx));
    const diff = (a: number[], idx: number[]) => { let h = 0, hn = 0, l = 0, ln = 0; for (const i of idx) { if (a[i] < 0) continue; if (high[i]) { h += a[i]; hn++; } else { l += a[i]; ln++; } } return hn && ln ? h / hn - l / ln : null; };
    const d1 = clusterBootstrap(cl, idx => diff(s1, idx)), d5 = clusterBootstrap(cl, idx => diff(s5, idx));
    return { value: Math.exp(hr.est), n: iv.x.length, parts: { ...estParts('logHrBirth', hr), ...estParts('surv1Diff', d1), ...estParts('surv5Diff', d5), intervalsHigh: nHigh, intervalsOther: nLow }, pass: hr.lo > 0 && d1.lo > 0 };
  },
};

// ---------------------------------------------------------------------------
// T-DEM-15: maternal loss after weaning (pre-registered in §1.12; the row is unchanged)
// ---------------------------------------------------------------------------

const alphaYears = (d: Derived, id: number) => d.rec.alpha.filter(a => a.id === id).length / 365.25;

const tDem15: MetricDef = {
  id: 'T-DEM-15', sealed: SEALED, pool: 'custom',
  protocol: 'census + genetic record (sealed; early-life-prereg §1.12): known-age sons; orphans lost the mother at 4.0–11.99 y in her community, non-orphans had her alive in the community to 12; excluded: loss before 4, the mother leaving before 12, sons that transferred. (1) age at conception (birth − 228 d) of the first offspring born in his community that survived >= 2 y, among males >= 14 with one, orphan − non-orphan difference in means; (2) Poisson GLM of such paternities from age 10, offset log(community conceptions leading to offspring surviving >= 2 y from his age 10), orphan term with fixed seed × community effects; alpha tenure model reported; (3) time-varying stratified Cox from age 4. 90% cluster bootstrap over mothers; insufficient below 8 orphans or 8 non-orphans with a paternity, or 10 orphan deaths; pass if difference > 0, log rate ratio < 0 and HR > 1, each with its 90% interval excluding the null (crockford2020; nakamura2014)',
  compute: d => {
    const excluded = (id: number, loss: Loss | null) => {
      const r = d.roster.get(id)!;
      if (d.rec.transfers.some(x => x.id === id)) return true;
      if (d.rec.transfers.some(x => x.id === r.mother && x.tSeen > r.birthEst && x.tSeen < r.birthEst + 12 * YEAR_H)) return true;
      return !!loss && loss.t <= d.t1 && loss.age >= 4 && loss.age < 12 && !loss.inCommunity;
    };
    const surv = orphanRows(d, sx => sx === 'male', 4, 4, 12, false, excluded);
    const births = d.rec.births.map(b => ({ b, surv2: b.tSeen + 2 * YEAR_H <= d.t1 && ((deathTime(d, b.id) ?? Infinity) > b.tSeen + 2 * YEAR_H), conception: b.tSeen - GESTATION_H }));
    const m = { orphan: [] as number[], cluster: [] as number[], stratum: [] as number[], first: [] as number[], pats: [] as number[], opps: [] as number[], alpha: [] as number[] };
    for (const r of d.rec.roster) {
      if (!r.knownAge || r.sex !== 'male' || r.mother <= 0) continue;
      const loss = lossOf(d, r.id);
      if (excluded(r.id, loss) || (loss && loss.t <= d.t1 && loss.age < 4)) continue;
      const end = Math.min(deathTime(d, r.id) ?? d.t1, d.t1);
      if (d.ageAt(r.id, end) < 14) continue;
      const orphan = !!loss && loss.t <= d.t1 && loss.age < 12 ? 1 : 0;
      const t10 = r.birthEst + 10 * YEAR_H;
      let first = -1, pats = 0, opps = 0;
      for (const { b, surv2, conception } of births) {
        if (!surv2 || conception < t10 || conception > end || b.troop !== communityAt(d, r.id, b.tSeen)) continue;
        opps++;
        if (b.father === r.id) { pats++; const a = (conception - r.birthEst) / YEAR_H; if (first < 0 || a < first) first = a; }
      }
      m.orphan.push(orphan); m.cluster.push(clusterOf(d, r.id)); m.stratum.push(stratumOf(d, r.id)); m.first.push(first); m.pats.push(pats); m.opps.push(opps); m.alpha.push(alphaYears(d, r.id));
    }
    return { value: null, n: m.orphan.length, raw: { ...rawOf(surv, 's'), mOrphan: m.orphan, mCluster: m.cluster, mStratum: m.stratum, mFirst: m.first, mPats: m.pats, mOpps: m.opps, mAlpha: m.alpha } };
  },
  pooled: s => {
    const surv = joinCox(s, 's'), g = (k: string) => s.flatMap(v => v.raw?.[k] ?? []);
    const orphan = g('mOrphan'), cluster = g('mCluster'), stratum = g('mStratum'), first = g('mFirst'), pats = g('mPats'), opps = g('mOpps'), alpha = g('mAlpha');
    const withPat = (o: number) => orphan.filter((x, i) => x === o && first[i] >= 0).length;
    const oPat = withPat(1), nPat = withPat(0), oDeaths = orphanDeaths(surv);
    const counts = { orphansWithPaternity: oPat, nonOrphansWithPaternity: nPat, orphanDeaths: oDeaths, neverSiredOrphans: orphan.filter((x, i) => x === 1 && first[i] < 0).length, neverSiredNonOrphans: orphan.filter((x, i) => x === 0 && first[i] < 0).length };
    if (oPat < 8 || nPat < 8 || oDeaths < 10) return { ...none(`insufficient: ${oPat} orphans and ${nPat} non-orphans with a paternity (8 each), ${oDeaths} orphan deaths (10)`, orphan.length), parts: counts };
    const meanDiff = (idx: number[]) => { let a = 0, an = 0, b = 0, bn = 0; for (const i of idx) { if (first[i] < 0) continue; if (orphan[i]) { a += first[i]; an++; } else { b += first[i]; bn++; } } return an && bn ? a / an - b / bn : null; };
    const glm = (idx: number[], withAlpha: boolean) => {
      const use = idx.filter(i => opps[i] > 0), strata = [...new Set(use.map(i => stratum[i]))].filter(st => use.some(i => stratum[i] === st && pats[i] > 0)).sort((a, b) => a - b);
      const rows = use.filter(i => strata.includes(stratum[i]));
      if (!rows.some(i => orphan[i]) || !rows.some(i => !orphan[i])) return null;
      const X = rows.map(i => [orphan[i], ...(withAlpha ? [alpha[i]] : []), ...strata.slice(1).map(st => (stratum[i] === st ? 1 : 0))]);
      const f = poissonGlm(X, rows.map(i => pats[i]), rows.map(i => Math.log(opps[i])));
      return f.converged ? f.beta[1] : null;
    };
    const p1 = clusterBootstrap(cluster, meanDiff), p2 = clusterBootstrap(cluster, idx => glm(idx, false)), p2a = clusterBootstrap(cluster, idx => glm(idx, true), 200);
    const p3 = clusterBootstrap(surv.cluster, idx => logHr(surv, idx));
    const pass = p1.lo > 0 && p2.hi < 0 && p3.lo > 0;
    return { value: p1.est, n: orphan.length, parts: { ...counts, ...estParts('firstPaternityDiffY', p1), ...estParts('logRateRatio', p2), logRateRatioWithAlphaTenure: p2a.est, ...estParts('logHrSurvival', p3) }, pass,
      note: 'direction partly encoded: the lever directions follow crockford2020\'s proposed mechanisms, and guardMaxAgeY = 12 is crockford2020\'s age of social independence' };
  },
};

// ---------------------------------------------------------------------------
// T-DEM-16, T-DEM-17: survival after maternal loss by age class and sex (stanton2020)
// ---------------------------------------------------------------------------

const tDem16: MetricDef = {
  id: 'T-DEM-16', sealed: SEALED, pool: 'custom',
  protocol: 'census + genealogy (sealed; §1.3): known-age daughters at risk from 5 y; time-varying stratified Cox, orphan on at a loss at 5–9.99 y in the mother\'s community, losses before 5 excluded, later losses censored; HR orphan vs not; 90% cluster bootstrap over mothers; pass if the 90% lower bound > 1; insufficient below 300 orphan-years or 10 orphan deaths; the 0–4.99 class is an unscored part (stanton2020)',
  compute: d => ({ value: null, n: 0, raw: { ...rawOf(orphanRows(d, sx => sx === 'female', 5, 5, 10, true), 'a'), ...rawOf(orphanRows(d, sx => sx === 'female', 0, 0, 5, true), 'b') } }),
  pooled: s => {
    const c = joinCox(s, 'a'), young = joinCox(s, 'b'), oy = orphanYears(c), od = orphanDeaths(c);
    const e0 = orphanDeaths(young) >= 1 ? clusterBootstrap(young.cluster, idx => logHr(young, idx), 200) : null;
    const parts = { orphanYears: oy, orphanDeaths: od, logHrClass0to5: e0 ? e0.est : null };
    if (oy < 300 || od < 10) return { ...none(`insufficient: ${oy.toFixed(0)} orphan-years (300), ${od} orphan deaths (10)`, od), parts };
    const e = clusterBootstrap(c.cluster, idx => logHr(c, idx));
    return { value: Math.exp(e.est), n: od, parts: { ...parts, ...estParts('logHr', e) }, pass: e.lo > 0 };
  },
};

const tDem17: MetricDef = {
  id: 'T-DEM-17', sealed: SEALED, pool: 'custom',
  protocol: 'census + genealogy (sealed; §1.4): known-age individuals at risk from 10 y; time-varying stratified Cox by sex, orphan on at a loss at 10–14.99 y in the mother\'s community (earlier losses excluded, later censored); Δ = log HR(sons) − log HR(daughters) with a joint 90% cluster bootstrap over mothers; pass if the lower bound > 0; insufficient below 200 orphan-years or 10 orphan deaths per sex, or a daughters\' HR interval wider than 4-fold; class-level log HRs (sons 0–4.99, 5–9.99, 10–14.99; daughters 10–14.99) are unscored parts (stanton2020)',
  compute: d => {
    const both = orphanRows(d, () => true, 10, 10, 15, true);
    return { value: null, n: 0, raw: { ...rawOf(both, 'c'), ...rawOf(orphanRows(d, sx => sx === 'male', 0, 0, 5, true), 'm0'), ...rawOf(orphanRows(d, sx => sx === 'male', 5, 5, 10, true), 'm5') } };
  },
  pooled: s => {
    const c = joinCox(s, 'c');
    const bySex = (sex: number): CoxRaw => { const o = emptyCox(); c.sex.forEach((x, i) => { if (x === sex) for (const k of Object.keys(o) as (keyof CoxRaw)[]) o[k].push(c[k][i]); }); return o; };
    const sons = bySex(1), daughters = bySex(0);
    const counts = { orphanYearsSons: orphanYears(sons), orphanDeathsSons: orphanDeaths(sons), orphanYearsDaughters: orphanYears(daughters), orphanDeathsDaughters: orphanDeaths(daughters) };
    const m0 = joinCox(s, 'm0'), m5 = joinCox(s, 'm5');
    const part = (x: CoxRaw) => (orphanDeaths(x) >= 1 ? clusterBootstrap(x.cluster, idx => logHr(x, idx), 200).est : null);
    const unscored = { logHrSons0to5: part(m0), logHrSons5to10: part(m5) };
    if (Math.min(counts.orphanYearsSons, counts.orphanYearsDaughters) < 200 || Math.min(counts.orphanDeathsSons, counts.orphanDeathsDaughters) < 10)
      return { ...none(`insufficient: orphan-years sons ${counts.orphanYearsSons.toFixed(0)}, daughters ${counts.orphanYearsDaughters.toFixed(0)} (200 each); orphan deaths ${counts.orphanDeathsSons} / ${counts.orphanDeathsDaughters} (10 each)`), parts: { ...counts, ...unscored } };
    const delta = (idx: number[]) => { const a = logHr(c, idx.filter(i => c.sex[i] === 1)), b = logHr(c, idx.filter(i => c.sex[i] === 0)); return a === null || b === null ? null : a - b; };
    const dl = clusterBootstrap(c.cluster, delta), es = clusterBootstrap(sons.cluster, idx => logHr(sons, idx)), ed = clusterBootstrap(daughters.cluster, idx => logHr(daughters, idx));
    const parts = { ...counts, ...unscored, ...estParts('delta', dl), logHrSons10to15: es.est, ...estParts('logHrDaughters10to15', ed) };
    if (Math.exp(ed.hi - ed.lo) > 4) return { ...none('insufficient: the daughters\' 90% HR interval is wider than 4-fold', counts.orphanDeathsDaughters), parts };
    return { value: dl.est, n: counts.orphanDeathsSons + counts.orphanDeathsDaughters, parts, pass: dl.lo > 0 };
  },
};

// ---------------------------------------------------------------------------
// T-DEM-18: stress after maternal loss (encoded)
// ---------------------------------------------------------------------------

/** Rows for a linear model with a cluster per row; `x` excludes the intercept. */
interface LinRaw { y: number[]; x: number[][]; cluster: number[] }
const coef = (m: LinRaw, idx: number[], k: number) => { const f = linearFit(idx.map(i => m.x[i]), idx.map(i => m.y[i])); return f ? f.beta[k] : null; };

const tDem18: MetricDef = {
  id: 'T-DEM-18', sealed: SEALED, pool: 'custom',
  protocol: 'endocrine proxy (truth; sealed; §1.5): one stress reading per follow-day at 06:00–08:00 of immatures under 12 and males of 12 or more in the focal party; known ages; immatures: log reading on recent orphan (< 2 y since the loss), earlier orphan and non-orphan (mother alive in the community), age and sex; males >= 12: orphaned before 12 vs not, with age; 90% bootstrap over individuals; recent above non-orphans (lower bound > 0), earlier orphans and adult orphan males not different (interval includes 0); insufficient below 5 recently orphaned individuals with samples (girardButtoz2021)',
  compute: d => {
    const imm: LinRaw = { y: [], x: [], cluster: [] }, mal: LinRaw = { y: [], x: [], cluster: [] }, recentIds = new Set<number>();
    for (const smp of d.rec.stress) {
      const r = d.roster.get(smp.id);
      if (!r || !r.knownAge || !(smp.v > 0)) continue;
      const age = d.ageAt(r.id, smp.t), loss = lossOf(d, r.id), lost = !!loss && loss.t <= smp.t, cl = d.rec.worldSeed * 1e6 + r.id;
      if (lost && !loss!.inCommunity) continue;
      if (age < 12) {
        const recent = lost && smp.t - loss!.t < 2 * YEAR_H ? 1 : 0, earlier = lost && !recent ? 1 : 0;
        if (recent) recentIds.add(cl);
        imm.y.push(Math.log(smp.v)); imm.x.push([recent, earlier, age, r.sex === 'male' ? 1 : 0]); imm.cluster.push(cl);
      } else if (r.sex === 'male') {
        mal.y.push(Math.log(smp.v)); mal.x.push([lost && loss!.age < 12 ? 1 : 0, age]); mal.cluster.push(cl);
      }
    }
    return { value: null, n: recentIds.size, raw: { iy: imm.y, ix: imm.x.flat(), ic: imm.cluster, my: mal.y, mx: mal.x.flat(), mc: mal.cluster, recent: [...recentIds] } };
  },
  pooled: s => {
    const g = (k: string) => s.flatMap(v => v.raw?.[k] ?? []);
    const chunk = (a: number[], k: number) => a.reduce<number[][]>((o, v, i) => { if (i % k === 0) o.push([]); o[o.length - 1].push(v); return o; }, []);
    const imm: LinRaw = { y: g('iy'), x: chunk(g('ix'), 4), cluster: g('ic') }, mal: LinRaw = { y: g('my'), x: chunk(g('mx'), 2), cluster: g('mc') };
    const recent = new Set(g('recent')).size;
    if (recent < 5) return none(`${recent} recently orphaned individuals with samples (5)`, recent);
    const r = clusterBootstrap(imm.cluster, idx => coef(imm, idx, 1)), e = clusterBootstrap(imm.cluster, idx => coef(imm, idx, 2));
    const m = mal.y.length && mal.x.some(x => x[0] === 1) ? clusterBootstrap(mal.cluster, idx => coef(mal, idx, 1)) : null;
    const includes0 = (x: Estimate) => x.lo <= 0 && x.hi >= 0;
    return { value: r.est, n: recent, parts: { ...estParts('recent', r), ...estParts('earlier', e), ...(m ? estParts('adultMales', m) : {}) }, pass: r.lo > 0 && includes0(e) && (!m || includes0(m)) };
  },
};

// ---------------------------------------------------------------------------
// T-DEM-19, T-DEM-20: lean-mass proxy (encoded)
// ---------------------------------------------------------------------------

/** Half-year age bins × sex as dummy columns (the first cell is the reference). */
function ageSexCells(ages: number[], sexes: number[]): number[][] {
  const keys = ages.map((a, i) => `${Math.floor(a * 2)}|${sexes[i]}`), levels = [...new Set(keys)].sort();
  return keys.map(k => levels.slice(1).map(l => (k === l ? 1 : 0)));
}

function leanModel(d: Derived, cls: (id: number, t: number, age: number) => number | null, ageLo: number, ageHi: number) {
  const y: number[] = [], z: number[] = [], ages: number[] = [], sexes: number[] = [], cluster: number[] = [], ids = new Set<number>();
  for (const smp of d.rec.lean) {
    const r = d.roster.get(smp.id);
    if (!r || !r.knownAge || !(smp.v > 0)) continue;
    const age = d.ageAt(r.id, smp.t);
    if (age < ageLo || age >= ageHi) continue;
    const c = cls(r.id, smp.t, age);
    if (c === null) continue;
    y.push(Math.log(smp.v)); z.push(c); ages.push(age); sexes.push(r.sex === 'male' ? 1 : 0); cluster.push(d.rec.worldSeed * 1e6 + r.id);
    if (c === 1) ids.add(d.rec.worldSeed * 1e6 + r.id);
  }
  return { y, z, ages, sexes, cluster, focalIds: [...ids] };
}
function leanPooled(s: SeedValue[], minIds: number, label: string): SeedValue {
  const g = (k: string) => s.flatMap(v => v.raw?.[k] ?? []);
  const y = g('y'), z = g('z'), ages = g('ages'), sexes = g('sexes'), cluster = g('cluster'), n = new Set(g('focalIds')).size;
  if (n < minIds) return none(`${n} ${label} with samples (${minIds})`, n);
  const cells = ageSexCells(ages, sexes), m: LinRaw = { y, x: z.map((v, i) => [v, ...cells[i]]), cluster };
  const e = clusterBootstrap(cluster, idx => coef(m, idx, 1));
  return { value: e.est, n, parts: estParts('coefficient', e), pass: e.hi < 0 };
}

const tDem19: MetricDef = {
  id: 'T-DEM-19', sealed: SEALED, pool: 'custom',
  protocol: 'urine proxy (truth) + census (sealed; §1.6): lean-mass samples (leanIndex, one per 10 follow-days present) of known-age individuals 4–15 y; log index on orphan (mother lost at 4–9.99 y, after weaning; losses before 4 excluded, samples after a loss at 10 or more dropped) with half-year age × sex cells; 90% bootstrap over individuals; pass if the orphan coefficient\'s upper bound < 0; insufficient below 10 orphans with samples (samuni2020)',
  compute: d => {
    const m = leanModel(d, (id, t) => {
      const loss = lossOf(d, id);
      if (!loss || loss.t > t) return 0;
      if (!loss.inCommunity || loss.age < 4) return null;
      return loss.age < 10 ? 1 : null;
    }, 4, 16);
    return { value: null, n: m.focalIds.length, raw: m };
  },
  pooled: s => leanPooled(s, 10, 'orphans'),
};

const tDem20: MetricDef = {
  id: 'T-DEM-20', sealed: SEALED, pool: 'custom',
  protocol: 'urine proxy (truth) + census + Elo (sealed; §1.7): lean-mass samples of known-age 4–10-year-olds whose mother is alive and in the community; log index on not-alpha-mother (the alpha female = top of the female order that day) with half-year age × sex cells; 90% bootstrap over individuals; pass if the not-alpha coefficient\'s upper bound < 0; insufficient below 5 offspring of alpha mothers (samuni2020)',
  compute: d => {
    const top = (troop: number, t: number) => { const day = Math.floor((t + 6.5) / 24) + 1; let best: { day: number; ids: number[] } | null = null; for (const f of d.rec.femaleOrder) if (f.troop === troop && f.day <= day && (!best || f.day > best.day)) best = f; return best?.ids[0] ?? -1; };
    const alphaKids = new Set<number>();
    const m = leanModel(d, (id, t) => {
      const r = d.roster.get(id)!, loss = lossOf(d, id);
      if (r.mother <= 0 || (loss && loss.t <= t) || communityAt(d, r.mother, t) !== communityAt(d, id, t)) return null;
      const alpha = top(communityAt(d, id, t), t) === r.mother;
      if (alpha) alphaKids.add(d.rec.worldSeed * 1e6 + id);
      return alpha ? 0 : 1;
    }, 4, 11);
    return { value: null, n: alphaKids.size, raw: { ...m, focalIds: [...alphaKids] } };
  },
  pooled: s => leanPooled(s, 5, 'offspring of alpha mothers'),
};

// ---------------------------------------------------------------------------
// T-DEM-21, T-DEM-22: neighbour pressure during pregnancy (lemoine2020a)
// ---------------------------------------------------------------------------

interface Kernel { ud: UdGrid; lv: Float64Array; cx: number; cz: number; area95: number; n: number }

/**
 * The neighbour-pressure index (lemoine2020a STAR Methods): NPI = mean over encounters j in the window of I_j × K_j,
 * times F. I = max(0, 1 − d/d75) with d the distance from the territory centre (mean of the previous 12 months' fixes)
 * and d75 the distance from the centre to the 75% kernel border along the same ray (the source's transform is
 * UNVERIFIED; this is the pre-registered design fallback). K = (10 − b)/10 for the location's 10% kernel band b of the
 * previous 12 months (0 outside the kernel). F = 1 / mean observation days (community-days with a follow) between
 * consecutive encounters in the window (1 / observation days with a single encounter; NPI 0 without encounters).
 */
export function npiTools(d: Derived) {
  const P = d.rec.points, fix = Math.round(30 / 60 / d.tH), half = d.rec.mapSize / 2, pad = 4 * d.profile.kdeCellM;
  const bounds: [number, number, number, number] = [-half - pad, -half - pad, half + pad, half + pad];
  const fixes = new Map<number, { t: number; x: number; z: number }[]>();
  for (const t of d.troops) fixes.set(t, []);
  d.rec.follows.forEach((f, fi) => { const l = fixes.get(f.troop); if (!l) return; for (const i of d.followPts[fi]) if (P.t.data[i] % fix === 0) l.push({ t: P.t.data[i] * d.tH, x: P.x.data[i], z: P.z.data[i] }); });
  const kernels = new Map<string, Kernel | null>();
  const kernel = (troop: number, t: number): Kernel | null => {
    const m = Math.floor(t / MONTH_H), key = `${troop}|${m}`;
    if (kernels.has(key)) return kernels.get(key)!;
    const pts = (fixes.get(troop) ?? []).filter(f => f.t >= (m - 12) * MONTH_H && f.t < m * MONTH_H);
    let k: Kernel | null = null;
    if (pts.length >= 50) {
      const ud = kde(pts.map(p => p.x), pts.map(p => p.z), d.profile.kdeCellM, bounds);
      k = { ud, lv: isoplethLevels(ud), cx: pts.reduce((a, p) => a + p.x, 0) / pts.length, cz: pts.reduce((a, p) => a + p.z, 0) / pts.length, area95: isoplethArea(ud, 0.95), n: pts.length };
    }
    kernels.set(key, k);
    return k;
  };
  const followDays = new Map<number, number[]>();
  for (const f of d.rec.follows) { const l = followDays.get(f.troop) ?? []; const day = Math.floor((f.start + 6.5) / 24); if (l[l.length - 1] !== day) l.push(day); followDays.set(f.troop, l); }
  const obsDays = (troop: number, a: number, b: number) => (followDays.get(troop) ?? []).filter(x => x >= Math.floor((a + 6.5) / 24) && x < Math.floor((b + 6.5) / 24)).length;
  const npi = (troop: number, a: number, b: number): number => {
    const enc = d.rec.encounters.filter(e => e.troop === troop && e.t0 >= a && e.t0 < b).sort((p, q) => p.t0 - q.t0);
    if (!enc.length) return 0;
    let sum = 0;
    for (const e of enc) {
      const k = kernel(troop, e.t0);
      if (!k) continue;
      const lev = levelAt(k.ud, k.lv, e.x, e.z), dist = Math.hypot(e.x - k.cx, e.z - k.cz);
      let d75 = 0;
      const step = d.profile.kdeCellM / 2, ux = dist > 0 ? (e.x - k.cx) / dist : 1, uz = dist > 0 ? (e.z - k.cz) / dist : 0;
      for (let r = 0; r < d.rec.mapSize * 2; r += step) { if (levelAt(k.ud, k.lv, k.cx + ux * r, k.cz + uz * r) > 0.75) { d75 = r; break; } }
      const I = d75 > 0 ? Math.max(0, 1 - dist / d75) : 0, K = lev >= 1 ? 0 : (10 - Math.min(9, Math.floor(lev * 10))) / 10;
      sum += I * K;
    }
    const gaps: number[] = [];
    for (let i = 1; i < enc.length; i++) gaps.push(Math.max(1, obsDays(troop, enc[i - 1].t0, enc[i].t0)));
    const F = gaps.length ? 1 / (gaps.reduce((x, y) => x + y, 0) / gaps.length) : 1 / Math.max(1, obsDays(troop, a, b));
    return sum / enc.length * F;
  };
  return { npi, kernel };
}

/** Mean of f over monthly steps in [a, b). */
const monthlyMean = (a: number, b: number, f: (t: number) => number) => { let s = 0, n = 0; for (let t = a; t < b; t += MONTH_H) { s += f(t); n++; } return n ? s / n : 0; };
const PREG_H = 8.5 * MONTH_H;

const tDem21Compute = (d: Derived): SeedValue => {
  const { npi, kernel } = npiTools(d);
  const cols = { start: [] as number[], stop: [] as number[], event: [] as number[], stratum: [] as number[], cluster: [] as number[], npi: [] as number[], males: [] as number[], weaned: [] as number[], food: [] as number[], rank: [] as number[], mage: [] as number[], sex: [] as number[], l1: [] as number[], l2: [] as number[], l3: [] as number[] };
  for (const b of d.rec.births) {
    const r = d.roster.get(b.id), mother = d.roster.get(b.mother);
    if (!r || !mother || !r.knownAge || b.tSeen - PREG_H - 12 * MONTH_H < d.t0) continue;
    const troop = b.troop, dt = deathTime(d, b.id), mdt = deathTime(d, b.mother), end = Math.min(dt ?? d.t1, d.t1);
    if (dt !== null && mdt !== null && Math.floor(dt / MONTH_H) === Math.floor(mdt / MONTH_H)) continue; // died in the same month as the mother (excluded in the source)
    if (!(end > b.tSeen)) continue;
    const a = b.tSeen - PREG_H;
    const order = (t: number) => { const day = Math.floor((t + 6.5) / 24) + 1; let best: { day: number; ids: number[] } | null = null; for (const f of d.rec.femaleOrder) if (f.troop === troop && f.day <= day && (!best || f.day > best.day)) best = f; const k = best ? best.ids.indexOf(b.mother) : -1; return best && k >= 0 ? k / Math.max(1, best.ids.length - 1) : 0.5; };
    cols.start.push(0); cols.stop.push((end - b.tSeen) / YEAR_H); cols.event.push(dt !== null && dt <= d.t1 ? 1 : 0);
    cols.stratum.push(d.rec.worldSeed * 1000 + troop); cols.cluster.push(d.rec.worldSeed * 1e6 + b.mother);
    cols.npi.push(npi(troop, a, b.tSeen));
    cols.males.push(monthlyMean(a, b.tSeen, t => d.adultMales(troop, t).length));
    cols.weaned.push(monthlyMean(a, b.tSeen, t => d.rec.roster.filter(x => communityAt(d, x.id, t) === troop && d.aliveAt(x.id, t) && d.ageAt(x.id, t) >= 5).length));
    cols.food.push(monthlyMean(a, b.tSeen, t => (d.phen.get(Math.floor(t / MONTH_H)) ?? 0) * (kernel(troop, t)?.area95 ?? 0)));
    cols.rank.push(order(b.tSeen)); cols.mage.push(d.ageAt(b.mother, b.tSeen)); cols.sex.push(r.sex === 'male' ? 1 : 0);
    for (const [k, y] of [['l1', 1], ['l2', 2], ['l3', 3]] as const) cols[k].push(npi(troop, b.tSeen, Math.max(b.tSeen + 1, Math.min(end, b.tSeen + y * YEAR_H))));
  }
  return { value: null, n: cols.event.reduce((x, y) => x + y, 0), raw: cols };
};

/** z-scores a column over all offspring. */
const zscore = (v: number[]) => { const m = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length); const s = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, v.length - 1)) || 1; return v.map(x => (x - m) / s); };
function npiFit(s: SeedValue[], pressureKey: string, B = 1000): { e: Estimate; deaths: number } {
  const g = (k: string) => s.flatMap(v => v.raw?.[k] ?? []);
  const start = g('start'), stop = g('stop'), event = g('event'), stratum = g('stratum'), cluster = g('cluster');
  const X = [g(pressureKey), g('males'), g('weaned'), g('food'), g('rank'), g('mage')].map(zscore), sex = g('sex');
  const rows: CoxRow[] = start.map((_, i) => ({ start: start[i], stop: stop[i], event: event[i], x: [...X.map(c => c[i]), sex[i]], stratum: stratum[i] }));
  const e = clusterBootstrap(cluster, idx => { const f = cox(idx.map(i => rows[i]), 7); return f.converged ? f.beta[0] : null; }, B);
  return { e, deaths: event.reduce((a, b) => a + b, 0) };
}

const tDem21: MetricDef = {
  id: 'T-DEM-21', sealed: SEALED, pool: 'custom',
  protocol: 'all-occurrence encounters + fixes + census (sealed; §1.8): offspring born >= 20.5 months into the observation (12-month kernels); NPI over the 8.5 months before birth (lemoine2020a; I transform UNVERIFIED → max(0, 1 − d/d75), design); stratified Cox of offspring survival on z-scored NPI, mature males, weaned individuals and food availability (transect index × 95% kernel area), with mother\'s rank, her age and offspring sex as controls; offspring dying in the mother\'s death month excluded; 90% cluster bootstrap over mothers; pass if the HR per SD of NPI has a 90% lower bound > 1; insufficient below 30 offspring deaths',
  compute: tDem21Compute,
  pooled: s => {
    const deaths = s.reduce((a, v) => a + (v.raw?.event ?? []).reduce((x, y) => x + y, 0), 0);
    if (deaths < 30) return none(`${deaths} offspring deaths (30)`, deaths);
    const { e } = npiFit(s, 'npi');
    return { value: Math.exp(e.est), n: deaths, parts: estParts('logHrPerSd', e), pass: e.lo > 0 };
  },
};

const tDem22: MetricDef = {
  id: 'T-DEM-22', sealed: SEALED, pool: 'custom',
  protocol: 'as T-DEM-21 (sealed; §1.9): the same model refitted with NPI averaged over the first 1, 2 and 3 years of lactation (to the offspring\'s death or the run end if earlier); pass if the pregnancy-window log HR exceeds each lactation-window log HR (point estimates); insufficient below 30 offspring deaths (lemoine2020a)',
  compute: tDem21Compute,
  pooled: s => {
    const deaths = s.reduce((a, v) => a + (v.raw?.event ?? []).reduce((x, y) => x + y, 0), 0);
    if (deaths < 30) return none(`${deaths} offspring deaths (30)`, deaths);
    const p = npiFit(s, 'npi', 200).e.est, l = ['l1', 'l2', 'l3'].map(k => npiFit(s, k, 200).e.est);
    return { value: p, n: deaths, parts: { pregnancy: p, lactation1: l[0], lactation2: l[1], lactation3: l[2] }, pass: l.every(x => p > x) };
  },
};

// ---------------------------------------------------------------------------
// T-DEM-23: aggression received by immatures, by sex (sabbi2021)
// ---------------------------------------------------------------------------

const tDem23: MetricDef = {
  id: 'T-DEM-23', sealed: SEALED, pool: 'custom',
  protocol: 'all-occurrence agonism + party scans (sealed; §1.10): known-age immatures under 9; aggression received = detected decided conflicts they lost or gave way in (charges, chases, attacks); exposure 0.25 h per 15-min scan in the focal party; per individual-half-year, Poisson GLM of counts on age, sex and age × sex with offset log hours (the source\'s negative binomial GLMM approximated; 90% bootstrap over individuals); pass if the age × sex coefficient\'s lower bound > 0 and the male:female rate ratio pooled over 4.5–6.0 y has a lower bound > 1; insufficient below 10 immatures per sex with >= 20 h at 4.5–6.0 y; expected verdict fail (no juvenile aggression mechanism)',
  compute: d => {
    const cell = new Map<string, { id: number; bin: number; male: number; hours: number; count: number }>();
    const get = (id: number, t: number) => {
      const r = d.roster.get(id);
      if (!r || !r.knownAge) return null;
      const age = d.ageAt(id, t);
      if (age < 0 || age >= 9) return null;
      const bin = Math.floor(age * 2), k = `${id}|${bin}`;
      let c = cell.get(k); if (!c) cell.set(k, c = { id, bin, male: r.sex === 'male' ? 1 : 0, hours: 0, count: 0 });
      return c;
    };
    const S = d.rec.scans;
    for (let i = 0; i < S.t.n; i++) { const t = S.t.data[i] * d.tH, o = S.memOff.data[i]; for (let k = 0; k < S.memN.data[i]; k++) { const c = get(S.members.data[o + k], t); if (c) c.hours += 0.25; } }
    for (const c of d.rec.conflicts) { if (!c.detected) continue; const x = get(c.loser, c.t); if (x) x.count++; }
    const rows = [...cell.values()].filter(c => c.hours > 0);
    return { value: null, n: rows.length, raw: { id: rows.map(c => d.rec.worldSeed * 1e6 + c.id), bin: rows.map(c => c.bin), male: rows.map(c => c.male), hours: rows.map(c => c.hours), count: rows.map(c => c.count) } };
  },
  pooled: s => {
    const g = (k: string) => s.flatMap(v => v.raw?.[k] ?? []);
    const id = g('id'), bin = g('bin'), male = g('male'), hours = g('hours'), count = g('count');
    const h = new Map<number, { male: number; h: number }>();
    id.forEach((x, i) => { if (bin[i] >= 9 && bin[i] < 12) { const v = h.get(x) ?? { male: male[i], h: 0 }; v.h += hours[i]; h.set(x, v); } });
    const nm = [...h.values()].filter(v => v.male && v.h >= 20).length, nf = [...h.values()].filter(v => !v.male && v.h >= 20).length;
    if (nm < 10 || nf < 10) return none(`${nm} males and ${nf} females with >= 20 h at 4.5–6.0 y (10 each)`, nm + nf);
    const inter = (idx: number[]) => { const f = poissonGlm(idx.map(i => { const a = (bin[i] + 0.5) / 2; return [a, male[i], a * male[i]]; }), idx.map(i => count[i]), idx.map(i => Math.log(hours[i]))); return f.converged ? f.beta[3] : null; };
    const ratio = (idx: number[]) => { let cm = 0, hm = 0, cf = 0, hf = 0; for (const i of idx) { if (bin[i] < 9 || bin[i] >= 12) continue; if (male[i]) { cm += count[i]; hm += hours[i]; } else { cf += count[i]; hf += hours[i]; } } return hm && hf && cf ? Math.log((cm / hm) / (cf / hf)) : null; };
    const a = clusterBootstrap(id, inter), r = clusterBootstrap(id, ratio);
    return { value: a.est, n: nm + nf, parts: { ...estParts('ageBySex', a), ...estParts('logRateRatioMF', r) }, pass: a.lo > 0 && r.lo > 0 };
  },
};

// ---------------------------------------------------------------------------
// T-DEM-24: one-year survival after maternal loss by age at loss (encoded)
// ---------------------------------------------------------------------------

const tDem24: MetricDef = {
  id: 'T-DEM-24', sealed: SEALED, pool: 'custom',
  protocol: 'census + genealogy (sealed; §1.11): known-age orphans (loss under 12 in the mother\'s community, at least one year before the run end); share alive one year after the loss, loss under 4 vs 4 or more; 90% cluster bootstrap over mothers of the difference (4+ minus under 4); pass if its lower bound > 0; insufficient below 10 orphans in either class (hobaiter2014)',
  compute: d => {
    const young: number[] = [], alive: number[] = [], cluster: number[] = [];
    for (const r of d.rec.roster) {
      if (!r.knownAge) continue;
      const loss = lossOf(d, r.id);
      if (!loss || !loss.inCommunity || loss.age >= 12 || loss.t + YEAR_H > d.t1) continue;
      const dt = deathTime(d, r.id);
      if (dt !== null && dt < loss.t) continue;
      young.push(loss.age < 4 ? 1 : 0); alive.push(dt === null || dt > loss.t + YEAR_H ? 1 : 0); cluster.push(clusterOf(d, r.id));
    }
    return { value: null, n: young.length, raw: { young, alive, cluster } };
  },
  pooled: s => {
    const g = (k: string) => s.flatMap(v => v.raw?.[k] ?? []);
    const young = g('young'), alive = g('alive'), cluster = g('cluster');
    const ny = young.filter(x => x).length, no = young.length - ny;
    if (ny < 10 || no < 10) return none(`${ny} orphans under 4 and ${no} at 4 or more (10 each)`, young.length);
    const diff = (idx: number[]) => { let a = 0, an = 0, b = 0, bn = 0; for (const i of idx) { if (young[i]) { a += alive[i]; an++; } else { b += alive[i]; bn++; } } return an && bn ? b / bn - a / an : null; };
    const e = clusterBootstrap(cluster, diff);
    return { value: e.est, n: young.length, parts: { ...estParts('survivalDiff', e), orphansUnder4: ny, orphans4Plus: no }, pass: e.lo > 0 };
  },
};

/** The sealed stage C8 metric definitions (merged into METRICS; scored rows exist for the ids registered in data/targets.json). */
export const EARLY_LIFE_METRICS: MetricDef[] = [tDem14, tDem15, tDem16, tDem17, tDem18, tDem19, tDem20, tDem21, tDem22, tDem23, tDem24];

// ---------------------------------------------------------------------------
// T-LET-5: payoff of expansion (scenario; outline in §1.12, details fixed here before any value)
// ---------------------------------------------------------------------------

/** A complete census of one scenario run (the scenario runs without the observer): births and deaths with times (eco-hours). */
export interface ScenarioCensus { births: { id: number; troop: number; t: number }[]; deaths: Record<number, number>; end: number; area: { t: number; km2: number }[] }

/**
 * T-LET-5 on one seed's paired runs: the expansion date E is the first month (after the first year) in which the winner's
 * 95% range exceeds its year-1 mean by >= 10% (design, in the spirit of T-LET-4's band). Pre window: the 3 years before E;
 * post window: 3 years starting one gestation (228 d; wood2025 started 8 months after the new area came into use) after E.
 * Births of the winner in each window, and deaths before age 3 among them (births with less than 3 years of follow-up and no
 * death are dropped from the death share); the same windows in the paired baseline. Null when no expansion happened.
 */
export function letFiveSeed(exp: ScenarioCensus, base: ScenarioCensus, winner: number): Record<string, number> | null {
  const year1 = exp.area.filter(a => a.t < exp.area[0].t + YEAR_H), ref = year1.reduce((s, a) => s + a.km2, 0) / Math.max(1, year1.length);
  const e = exp.area.find(a => a.t >= exp.area[0].t + YEAR_H && a.km2 >= 1.1 * ref);
  if (!e) return null;
  const pre: [number, number] = [e.t - 3 * YEAR_H, e.t], post: [number, number] = [e.t + GESTATION_H, e.t + GESTATION_H + 3 * YEAR_H];
  const tally = (c: ScenarioCensus, [a, b]: [number, number]) => {
    const bs = c.births.filter(x => x.troop === winner && x.t >= a && x.t < b);
    let died = 0, known = 0;
    for (const x of bs) { const dt = c.deaths[x.id]; if (dt !== undefined && dt < x.t + 3 * YEAR_H) { died++; known++; } else if (x.t + 3 * YEAR_H <= c.end) known++; }
    return { births: bs.length, died, known };
  };
  const ep = tally(exp, pre), eq = tally(exp, post), bp = tally(base, pre), bq = tally(base, post);
  return { expansionT: e.t, expPreBirths: ep.births, expPostBirths: eq.births, expPreDied: ep.died, expPreKnown: ep.known, expPostDied: eq.died, expPostKnown: eq.known,
    basePreBirths: bp.births, basePostBirths: bq.births, basePreDied: bp.died, basePreKnown: bp.known, basePostDied: bq.died, basePostKnown: bq.known };
}

/**
 * Pooled over seeds with an expansion (sums): pass if births rise and the infant death share falls after expansion, and
 * both changes exceed the paired baseline's; insufficient with fewer than 2 seeds with an expansion (seeds without one are
 * reported, not re-run).
 */
export function letFivePooled(perSeed: (Record<string, number> | null)[]): { pass: boolean | null; seedsWithExpansion: number; parts: Record<string, number> } {
  const ok = perSeed.filter((x): x is Record<string, number> => x !== null);
  const sum = (k: string) => ok.reduce((a, x) => a + x[k], 0);
  const share = (d: string, k: string) => (sum(k) ? sum(d) / sum(k) : NaN);
  const parts = { expPreBirths: sum('expPreBirths'), expPostBirths: sum('expPostBirths'), basePreBirths: sum('basePreBirths'), basePostBirths: sum('basePostBirths'),
    expPreDeathShare: share('expPreDied', 'expPreKnown'), expPostDeathShare: share('expPostDied', 'expPostKnown'), basePreDeathShare: share('basePreDied', 'basePreKnown'), basePostDeathShare: share('basePostDied', 'basePostKnown') };
  if (ok.length < 2) return { pass: null, seedsWithExpansion: ok.length, parts };
  const births = parts.expPostBirths > parts.expPreBirths && parts.expPostBirths - parts.expPreBirths > parts.basePostBirths - parts.basePreBirths;
  const deaths = parts.expPostDeathShare < parts.expPreDeathShare && parts.expPostDeathShare - parts.expPreDeathShare < parts.basePostDeathShare - parts.basePreDeathShare;
  return { pass: births && deaths, seedsWithExpansion: ok.length, parts };
}
