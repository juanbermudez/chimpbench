import { SOURCE_EFFORT_H_PER_YEAR } from './config';
import { CAT_FEED, CAT_GROOM, CAT_REST, CAT_TRAVEL, FEED_FRUIT, FEED_GROUND, FEED_MEAT } from './categories';
import { MONTH_H, shares, type Derived } from './derive';
import { P_LACT, type Records } from './records';
import { cellOf, cellRange, isoplethArea, kde } from './space';
import { conciliatoryTendency, dispersion, finite, hwi, kendall, ldaLeaveOneOut, logistic, mean, median, ols, pearson, poissonInterval, spearman, steepness } from './stats';

// One metric function per target id (data/targets.json), each implementing its source's computation on the
// observer's records (docs/realism-design.md §3.6). A function returns one seed's value; `pool` says how seeds
// combine. Targets whose mechanism does not exist yet carry `na` and print "n/a (mechanism missing)".

export interface SeedValue {
  value: number | null;
  parts?: Record<string, number | null>;
  /** Sample size in the target's unit (individuals, scans, encounters, …). */
  n: number;
  /** Pattern targets: this seed's verdict. */
  pass?: boolean | null;
  /** Omniscient counterpart, where one exists. */
  truth?: number | null;
  note?: string;
  /** Sufficient statistics for pooled ratios. */
  num?: number; den?: number;
  /** Extra per-seed data a custom pool needs. */
  raw?: Record<string, number[]>;
  /** Cell-based metrics: the fewest 500 m cells any community-year used. */
  cells?: number;
  /** 95% interval of the value (count-based metrics); a fail whose interval overlaps the band is inconclusive. */
  interval?: [number, number];
}
export interface MetricDef {
  id: string;
  /** Sampling protocol and computation, stated. */
  protocol: string;
  na?: string;
  structural?: string;
  compute?: (d: Derived) => SeedValue;
  /** mean: mean of seed values (default). ratio: Σnum / Σden (count-based; Poisson interval). pattern: majority of seed verdicts. custom: `pooled`. */
  pool?: 'mean' | 'ratio' | 'pattern' | 'custom';
  pooled?: (seeds: SeedValue[]) => SeedValue;
  /** Each of these parts must lie in the band for a pass (e.g. both sexes). */
  bandParts?: string[];
  /** Depends on absolute distances or areas, which the compressed map distorts (docs/realism-design.md §5.1). */
  scaleSensitive?: boolean;
  /** Count-based rate: when outside the band but the 95% Poisson interval overlaps it, the verdict is inconclusive. */
  poisson?: boolean;
  /**
   * Built on the 500 m cell grid (C6 review): when a community-year uses fewer than CELL_MIN cells the value is reported
   * but not scored (verdict 'scale'), because a single cell then moves it a lot. Seeds report `cells`.
   */
  cellBased?: boolean;
}
/** Fewest 500 m cells a community-year must use for a cell-based metric to be scored (C6 review; design). */
export const CELL_MIN = 20;

const none = (note: string, n = 0): SeedValue => ({ value: null, n, note });
/** Observation year of a time (hours): years count from the observer's start, after any burn-in (bug fix, C7a review round). */
const obsYear = (d: Derived, h: number) => Math.floor((h - d.rec.time0) / (365 * 24));
const H = (d: Derived, tick: number) => tick * d.tH;
const MIN_SAMPLES = 300; // individuals need >= 5 h of 1-min samples to enter a budget (design)
const NULLIPAROUS_BEFORE_Y = 12; // youngest Kibale mother 14.1 y (emeryThompson2007) minus the ±2 y founder age error (design)

// ---------------------------------------------------------------------------
// Shared computations
// ---------------------------------------------------------------------------

/** Per focal individual (adults): category shares over all its follow samples. */
function individualBudgets(d: Derived, filter?: (i: number) => boolean): Map<number, { sex: string; n: number; share: number[] }> {
  const P = d.rec.points, byId = new Map<number, number[]>();
  for (let i = 0; i < P.t.n; i++) {
    if (filter && !filter(i)) continue;
    const id = P.focal.data[i];
    let l = byId.get(id); if (!l) byId.set(id, l = []); l.push(i);
  }
  const out = new Map<number, { sex: string; n: number; share: number[] }>();
  for (const [id, idx] of byId) { const s = shares(d.rec, idx); if (s.n >= MIN_SAMPLES) out.set(id, { sex: d.roster.get(id)?.sex ?? '?', n: s.n, share: s.share }); }
  return out;
}

function sexMeans(b: Map<number, { sex: string; share: number[] }>, cat: (s: number[]) => number) {
  const m: number[] = [], f: number[] = [];
  for (const v of b.values()) (v.sex === 'male' ? m : f).push(cat(v.share));
  return { male: m.length ? mean(m) : null, female: f.length ? mean(f) : null, all: m.length + f.length ? mean([...m, ...f]) : null, n: m.length + f.length };
}

function truthShare(r: Records, sex: 'male' | 'female', cat: (s: number[]) => number): number {
  const a = r.truth.activity[sex], tot = a.reduce((p, q) => p + q, 0);
  return tot ? cat(a.map(v => v / tot)) : NaN;
}

function activityMetric(cat: (s: number[]) => number) {
  return (d: Derived): SeedValue => {
    const s = sexMeans(individualBudgets(d), cat);
    if (!s.n) return none('no individual with >= 5 h of samples');
    const tm = truthShare(d.rec, 'male', cat), tf = truthShare(d.rec, 'female', cat);
    return { value: s.all, parts: { male: s.male, female: s.female }, n: s.n, truth: finite(tm) && finite(tf) ? (tm + tf) / 2 : null };
  };
}

/** Community-days with a follow and follow hours, pooled. */
const followDays = (d: Derived) => [...d.followDays.values()].reduce((a, b) => a + b, 0);
const followHours = (d: Derived) => [...d.followHours.values()].reduce((a, b) => a + b, 0);
/** Events per 100 h of observation (wilson2012 and gilby2015 report effort this way). */
const per100h = (n: number, d: Derived) => { const h = followHours(d); return h > 0 ? n / h * 100 : null; };

/** Encounters classified per community. */
function encounters(d: Derived) { return d.rec.encounters; }

/** Detected hunts (hunt start seen or heard by a following team). */
function hunts(d: Derived) { return d.rec.hunts.filter(h => h.detected); }

/** Colobus encounters from scans: prey within range of the focal party; a new encounter when that prey was not in range at the previous scan of the follow. */
function colobusEncounters(d: Derived): { t: number; troop: number; prey: number; am: number; hunted: boolean }[] {
  const S = d.rec.scans, out: { t: number; troop: number; prey: number; am: number; hunted: boolean }[] = [];
  const hs = hunts(d);
  d.followScans.forEach((idx, f) => {
    let prev = -1;
    for (const i of idx) {
      const prey = S.prey.data[i];
      if (prey >= 0 && prey !== prev) {
        const t = H(d, S.t.data[i]), troop = d.rec.follows[f].troop;
        const hunted = hs.some(h => h.troop === troop && (h.prey === prey || h.prey < 0) && h.t0 >= t - 0.25 && h.t0 <= t + 1);
        out.push({ t, troop, prey, am: S.am.data[i], hunted });
      }
      prev = prey;
    }
  });
  return out;
}

/** Dominance interactions among adult males per community: decided conflicts (winner beats loser) and, unless `conflictsOnly`, pant-grunts (recipient beats giver). */
function maleDominance(d: Derived, conflictsOnly = false): Map<number, { ids: number[]; wins: number[][]; pantGrunts: Map<number, number>; allPG: number }> {
  const out = new Map<number, { ids: number[]; wins: number[][]; pantGrunts: Map<number, number>; allPG: number }>();
  const mid = d.days * 12;
  for (const troop of d.troops) {
    const ids = d.adultMales(troop, mid).sort((a, b) => a - b);
    const ix = new Map(ids.map((id, i) => [id, i]));
    const wins = ids.map(() => ids.map(() => 0));
    const pg = new Map<number, number>();
    let all = 0;
    for (const c of d.rec.conflicts) { if (!c.detected || c.troop !== troop) continue; const a = ix.get(c.winner), b = ix.get(c.loser); if (a !== undefined && b !== undefined) wins[a][b]++; }
    for (const e of d.rec.events) {
      if (e.kind !== 'pant-grunt' || e.troop !== troop) continue;
      all++;
      pg.set(e.target, (pg.get(e.target) ?? 0) + 1);
      const a = ix.get(e.target), b = ix.get(e.actor);
      if (a !== undefined && b !== undefined && !conflictsOnly) wins[a][b]++;
    }
    out.set(troop, { ids, wins, pantGrunts: pg, allPG: all });
  }
  return out;
}

/** Male rank numbers (1 = top) by observed normalized David's scores. */
function maleRanks(d: Derived): Map<number, number> {
  const r = new Map<number, number>();
  for (const { ids, wins } of maleDominance(d).values()) {
    if (ids.length < 2) continue;
    const { normDS } = steepness(wins);
    const order = ids.map((id, i) => ({ id, s: normDS[i] })).sort((a, b) => b.s - a.s || a.id - b.id);
    order.forEach((o, k) => r.set(o.id, k + 1));
  }
  return r;
}

/** Grooming hours given per ordered dyad (a→b) from detected grooming bouts with a known end. */
function groomHours(d: Derived): Map<string, number> {
  const g = new Map<string, number>();
  for (const e of d.rec.events) if (e.kind === 'groom' && e.end > e.t && e.target > 0) { const k = `${e.actor}>${e.target}`; g.set(k, (g.get(k) ?? 0) + (e.end - e.t)); }
  return g;
}

const maternalKin = (d: Derived, a: number, b: number) => {
  const ra = d.roster.get(a), rb = d.roster.get(b);
  if (!ra || !rb) return false;
  return ra.mother === b || rb.mother === a || (ra.mother > 0 && ra.mother === rb.mother);
};

/** Life table from the census: exposure (years) and deaths per age bin by sex, with estimated ages. */
const BINS = [0, 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 80];
function lifeTable(d: Derived) {
  const t0 = 0, t1 = d.days * 24;
  const exp = { male: BINS.map(() => 0), female: BINS.map(() => 0) }, dth = { male: BINS.map(() => 0), female: BINS.map(() => 0) };
  const deathT = new Map(d.rec.deaths.map(x => [x.id, x.tEst]));
  for (const r of d.rec.roster) {
    const from = Math.max(t0, r.firstSeen), to = Math.min(t1, deathT.get(r.id) ?? t1);
    if (to <= from) continue;
    const a0 = d.ageAt(r.id, from), a1 = d.ageAt(r.id, to);
    for (let i = 0; i < BINS.length - 1; i++) { const lo = Math.max(a0, BINS[i]), hi = Math.min(a1, BINS[i + 1]); if (hi > lo) exp[r.sex][i] += hi - lo; }
    if (deathT.has(r.id)) { const i = BINS.findIndex((b, k) => a1 >= b && a1 < BINS[k + 1]); if (i >= 0) dth[r.sex][i]++; }
  }
  return { exp, dth };
}
function e15From(exp: number[], dth: number[]): number {
  let l = 1, e = 0;
  for (let i = 4; i < BINS.length - 1; i++) {
    const h = dth[i] / Math.max(1e-9, exp[i]), w = BINS[i + 1] - BINS[i], end = l * Math.exp(-h * w);
    e += h > 0 ? (l - end) / h : l * w;
    l = end;
  }
  return e;
}
const addArr = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] ?? 0));

// ---------------------------------------------------------------------------
// Target metrics
// ---------------------------------------------------------------------------

const ACT = 'focal instantaneous point samples every 1 min on nest-to-nest follows; per individual (>= 5 h), mean of individual means by sex (villioth2025)';

export const METRICS: MetricDef[] = [
  // Activity budgets
  { id: 'T-ACT-1', protocol: ACT, compute: activityMetric(s => s[CAT_FEED]), bandParts: ['male', 'female'] },
  { id: 'T-ACT-2', protocol: ACT, compute: activityMetric(s => s[CAT_TRAVEL]), bandParts: ['male', 'female'] },
  { id: 'T-ACT-3', protocol: ACT + '; giving and receiving grooming', compute: activityMetric(s => s[CAT_GROOM]), bandParts: ['male', 'female'] },
  {
    id: 'T-ACT-4', protocol: 'focal point samples; rest + groom share per individual-month (>= 1 h), monthly means averaged (potts2011)',
    compute: d => {
      const P = d.rec.points, cells = new Map<string, { sex: string; c: number; n: number }>();
      for (let i = 0; i < P.t.n; i++) {
        const k = `${d.month(P.t.data[i])}|${P.focal.data[i]}`;
        let v = cells.get(k); if (!v) cells.set(k, v = { sex: d.roster.get(P.focal.data[i])?.sex ?? '?', c: 0, n: 0 });
        v.n++; if (P.cat.data[i] === CAT_REST || P.cat.data[i] === CAT_GROOM) v.c++;
      }
      const byMonth = new Map<number, number[]>();
      for (const [k, v] of cells) { if (v.n < 60) continue; const m = +k.split('|')[0]; let l = byMonth.get(m); if (!l) byMonth.set(m, l = []); l.push(v.c / v.n); }
      const months = [...byMonth.values()].map(l => mean(l));
      if (!months.length) return none('no individual-month with >= 1 h');
      const tm = truthShare(d.rec, 'male', s => s[CAT_REST] + s[CAT_GROOM]), tf = truthShare(d.rec, 'female', s => s[CAT_REST] + s[CAT_GROOM]);
      return { value: mean(months), n: months.length, truth: (tm + tf) / 2 };
    },
  },
  {
    id: 'T-ACT-5', protocol: 'focal point samples; male − female feeding share (mean of individual means) and travel share of lactating females vs males', pool: 'pattern',
    compute: d => {
      const b = individualBudgets(d);
      const s = sexMeans(b, x => x[CAT_FEED]);
      const lact = individualBudgets(d, i => (d.rec.points.flags.data[i] & P_LACT) !== 0 && d.roster.get(d.rec.points.focal.data[i])?.sex === 'female');
      const tl = mean([...lact.values()].map(v => v.share[CAT_TRAVEL])), tm = sexMeans(b, x => x[CAT_TRAVEL]).male;
      if (s.male === null || s.female === null || tm === null || !finite(tl)) return none('needs male, female and lactating-female budgets');
      const diff = s.male - s.female;
      return { value: diff, parts: { feedDiffMF: diff, travelLactF: tl, travelM: tm }, n: s.n, pass: Math.abs(diff) <= 0.05 && tl < tm };
    },
  },

  // Parties
  {
    id: 'T-PTY-1', protocol: '15-min scans of the focal party (all individuals, chain rule at the profile party link), mean size (wilson2012)',
    compute: d => { const S = d.rec.scans; if (!S.t.n) return none('no scans'); return { value: mean(S.size.view()), n: S.t.n }; },
  },
  {
    id: 'T-PTY-2', protocol: 'monthly mean scan party size vs the transect phenology index (R²), and feeding-party size vs crown radius (R²) (mitaniWatts2005; potts2011)', pool: 'pattern',
    compute: d => {
      const S = d.rec.scans, byMonth = new Map<number, number[]>(), fx: number[] = [], fy: number[] = [];
      for (let i = 0; i < S.t.n; i++) {
        const m = d.month(S.t.data[i]); let l = byMonth.get(m); if (!l) byMonth.set(m, l = []); l.push(S.size.data[i]);
        if (S.tree.data[i] >= 0 && S.feedN.data[i] > 0) { fx.push(S.canopy.data[i]); fy.push(S.feedN.data[i]); }
      }
      const mx: number[] = [], my: number[] = [];
      for (const [m, l] of byMonth) if (d.phen.has(m)) { mx.push(d.phen.get(m)!); my.push(mean(l)); }
      if (mx.length < 4 || fx.length < 20) return none('needs >= 4 months and >= 20 feeding scans');
      const fruit = ols(mx, my).r2, patch = ols(fx, fy).r2;
      return { value: patch, parts: { fruitR2: fruit, patchR2: patch }, n: fx.length, pass: fruit <= 0.1 && patch >= 0.2 && patch <= 0.8 };
    },
  },
  {
    id: 'T-PTY-3', protocol: 'follows reaching the periphery (scan centroid beyond the own 85% kernel isopleth) vs core-only follows; median of per-follow mean adult males (wilson2007)', pool: 'pattern',
    compute: d => {
      const S = d.rec.scans, per: number[] = [], core: number[] = [];
      d.followScans.forEach((idx, f) => {
        if (!idx.length) return;
        const troop = d.rec.follows[f].troop;
        let periph = false, am = 0;
        for (const i of idx) { am += S.am.data[i]; if (d.level(troop, S.cx.data[i], S.cz.data[i]) > 0.85) periph = true; }
        (periph ? per : core).push(am / idx.length);
      });
      if (per.length < 5 || core.length < 5) return none('needs >= 5 periphery and >= 5 core-only follows', per.length + core.length);
      const ratio = median(per) / Math.max(1e-9, median(core));
      return { value: ratio, parts: { periphery: median(per), core: median(core) }, n: per.length + core.length, pass: ratio >= 1.5 };
    },
  },
  {
    id: 'T-PTY-4', protocol: 'female focal point samples with no other independent individual in the party; mean of individual means (doran1997)',
    compute: d => {
      const P = d.rec.points, byId = new Map<number, [number, number]>();
      for (let i = 0; i < P.t.n; i++) { const id = P.focal.data[i]; if (d.roster.get(id)?.sex !== 'female') continue; const v = byId.get(id) ?? [0, 0]; v[1]++; if (P.partyInd.data[i] <= 1) v[0]++; byId.set(id, v); }
      const v = [...byId.values()].filter(x => x[1] >= MIN_SAMPLES).map(x => x[0] / x[1]);
      return v.length ? { value: mean(v), n: v.length } : none('no female with >= 5 h');
    },
  },

  // Ranging
  {
    id: 'T-RNG-1', protocol: 'annual 95% fixed kernel (reference bandwidth) of 30-min fixes on follows, West community, median over observation years; part cells98: the polygon around 98% of unique daily 500 m cells (wilson2012), same years; parts c1..c3: each community\'s kernel; km² field-equivalent (C6 review: the definition names both estimators; the cell polygon quantizes small ranges to 0.25 km² cells)', scaleSensitive: true,
    compute: d => {
      const s2 = d.profile.lengthScale ** 2 / 1e6, parts: Record<string, number | null> = {};
      const years = Math.max(1, Math.floor(d.years + 1e-9));
      const annual = (troop: number, f: (y: number) => number) => { const v: number[] = []; for (let y = 0; y < years; y++) { const a = f(y); if (a > 0) v.push(a * s2); } return v.length ? median(v) : null; };
      for (const t of d.troops) parts[`c${t}`] = annual(t, y => yearKernel(d, t, y));
      const west = d.troops[0];
      parts.cells98 = annual(west, y => yearRange(d, west, y));
      const w = d.ranges.get(west);
      return w && w.fixes && parts[`c${west}`] !== null ? { value: parts[`c${west}`], parts, n: w.fixes } : none('no fixes');
    },
  },
  {
    id: 'T-RNG-2', protocol: 'between-community OLS slope of the 98%-cell range (km², field-equivalent) on weaned individuals (lemoine2020b)', scaleSensitive: true, cellBased: true,
    compute: d => {
      const x: number[] = [], y: number[] = [], mid = d.days * 12, s2 = d.profile.lengthScale ** 2 / 1e6;
      for (const [t, r] of d.ranges) { if (!r.fixes) continue; x.push(d.rec.roster.filter(e => e.troop === t && d.aliveAt(e.id, mid) && d.ageAt(e.id, mid) >= 5).length); y.push(r.area98 * s2); }
      if (x.length < 3) return none('needs 3 communities with fixes');
      return { value: ols(x, y).slope, n: x.length, cells: fewestCells(d) };
    },
  },
  {
    id: 'T-RNG-3', protocol: 'share of 30-min fixes in the densest 36% of used cells, mean over communities (wilson2007)', cellBased: true,
    compute: d => { const v = [...d.ranges.values()].filter(r => r.fixes > 20).map(r => r.core); return v.length ? { value: mean(v), n: v.length, cells: fewestCells(d) } : none('too few fixes'); },
  },
  {
    id: 'T-RNG-4', protocol: 'sum of 5-min fix distances on complete (nest-to-nest, >= 8 h) follows of adult males; km/day field-equivalent (batesByrne2009)', scaleSensitive: true,
    compute: d => dayRange(d, 'male'),
  },
  {
    id: 'T-RNG-5', protocol: 'day range of lactating females ÷ adult males, same protocol as T-RNG-4 (batesByrne2009)',
    compute: d => {
      const m = dayRange(d, 'male'), f = dayRange(d, 'lact');
      if (m.value === null || f.value === null) return none('needs male and lactating-female complete follows');
      return { value: f.value / m.value, parts: { lactating: f.value, male: m.value }, n: f.n };
    },
  },
  {
    id: 'T-RNG-6', protocol: 'max ÷ min annual 98%-cell range per community over years (wilson2012)', cellBased: true,
    compute: d => {
      if (d.years < 2) return none('needs >= 2 years');
      const ratios: number[] = [];
      for (const troop of d.troops) {
        const areas: number[] = [];
        for (let y = 0; y < Math.floor(d.years); y++) areas.push(yearRange(d, troop, y));
        const pos = areas.filter(a => a > 0);
        if (pos.length >= 2) ratios.push(Math.max(...pos) / Math.min(...pos));
      }
      return ratios.length ? { value: mean(ratios), n: ratios.length, cells: fewestCells(d) } : none('no community with 2 ranged years');
    },
  },

  // Encounters
  {
    id: 'T-IGE-1', protocol: 'party follows staying with the larger subgroup (wilson2012; C5a); encounter classifier (strangers seen by the followed party, or stranger pant-hoots/drums heard by the team with or without a response; one encounter per neighbour until 60 min without detection) ÷ follow-hours × the source effort, 35,083 h in 15 y (wilson2012; effort normalization decided in C5a); parts: per follow-day × 365 (the C3 scoring), heard-only and seen/contact per community-year, all per 100 follow-hours (Kanyawara 0.34 = 120 in 35,083 h)',
    pool: 'ratio', poisson: true,
    compute: d => {
      const e = encounters(d), n = e.length, fd = followDays(d), fh = followHours(d), h = e.filter(x => x.modality === 'heard').length, eff = SOURCE_EFFORT_H_PER_YEAR['T-IGE-1'];
      return { value: fh ? n / fh * eff : null, num: n, den: fh / eff, n, truth: d.rec.truth.encounters * 2 / d.communityYears,
        parts: { perFollowDayYear: fd ? n / fd * 365 : null, heardPerYear: fh ? h / fh * eff : null, seenPerYear: fh ? (n - h) / fh * eff : null, per100h: per100h(n, d), followHoursPerDay: fd ? fh / fd : null } };
    },
  },
  {
    id: 'T-IGE-2', protocol: 'share of classified encounters with no stranger seen and no contact (wilson2012)', pool: 'ratio',
    compute: d => {
      const e = encounters(d), h = e.filter(x => x.modality === 'heard').length, T = d.rec.truth;
      return { value: e.length ? h / e.length : null, num: h, den: e.length, n: e.length, truth: T.encountersHeard + T.encountersSeen ? T.encountersHeard / (T.encountersHeard + T.encountersSeen) : null };
    },
  },
  {
    id: 'T-IGE-3', protocol: 'logistic regression of approach (focal moved >= approach distance toward the stranger source within 1 h) on own adult males in the party, pooled encounters (wilson2012)', pool: 'custom',
    compute: d => { const e = encounters(d); return { value: null, n: e.length, raw: { males: e.map(x => x.ownAM), approach: e.map(x => (x.approach ? 1 : 0)) } }; },
    pooled: s => {
      const X: number[][] = [], y: number[] = [];
      for (const v of s) v.raw?.males.forEach((m, i) => { X.push([m]); y.push(v.raw!.approach[i]); });
      if (y.length < 20 || !y.some(v => v) || y.every(v => v)) return none('needs >= 20 encounters with both outcomes', y.length);
      const f = logistic(X, y);
      return { value: f.beta[1], parts: { se: f.se[1], approachShare: mean(y) }, n: y.length };
    },
  },
  {
    id: 'T-IGE-4', protocol: 'playback trials on cloned worlds, calm stationary parties (speaker 18 m outward): counter-call = party loud call (pant-hoot, waa-bark, scream) within 5 min, approach = party centroid >= approach distance closer within 20 min; shares by adult males in the party (wilson2001)', pool: 'custom',
    compute: d => {
      const t = d.rec.experiments.filter(x => x.kind === 'playback');
      return { value: null, n: t.length, raw: { males: t.map(x => x.males), approached: t.map(x => (x.approached ? 1 : 0)), called: t.map(x => (x.called ? 1 : 0)) } };
    },
    pooled: s => {
      const g = { big: [0, 0, 0], small: [0, 0, 0], none: [0, 0, 0] };
      for (const v of s) v.raw?.males.forEach((m, i) => { const k = m >= 3 ? g.big : m >= 1 ? g.small : g.none; k[0]++; k[1] += v.raw!.approached[i]; k[2] += v.raw!.called[i]; });
      const sh = (k: number[], j: number) => (k[0] ? k[j] / k[0] : null);
      const parts = { approach3plus: sh(g.big, 1), call3plus: sh(g.big, 2), call1to2: sh(g.small, 2), callFemaleOnly: sh(g.none, 2), trials3plus: g.big[0], trials1to2: g.small[0], trialsNone: g.none[0] };
      if (g.big[0] < 3 || g.small[0] < 3) return { value: null, parts, n: g.big[0] + g.small[0] + g.none[0], note: 'needs >= 3 trials with >= 3 males and >= 3 with 1–2 males' };
      const pass = parts.approach3plus! >= 0.75 && parts.call3plus! >= 0.75 && parts.call1to2! <= 0.35 && (parts.callFemaleOnly === null || parts.callFemaleOnly <= 0.1);
      return { value: parts.call3plus, parts, n: g.big[0] + g.small[0] + g.none[0], pass };
    },
  },
  {
    id: 'T-IGE-5', protocol: 'median distance of encounter locations from the own range centroid (mean of 30-min fixes) ÷ equal-area radius of the 98%-cell range (wilson2012)', cellBased: true,
    compute: d => {
      const v: number[] = [];
      for (const e of encounters(d)) { const r = d.ranges.get(e.troop); if (!r || !r.area98) continue; v.push(Math.hypot(e.x - r.cx, e.z - r.cz) / Math.sqrt(r.area98 / Math.PI)); }
      return v.length ? { value: median(v), n: v.length, cells: fewestCells(d) } : none('no encounters');
    },
  },

  // Patrols
  {
    id: 'T-PAT-1', protocol: 'patrol classifier (>= 2 adult males, silent >= 20 min, focal travelling >= 50%, reaching the own 90% isopleth, >= 2 listening stops since C6) on focal follows ÷ community-days with a follow × 7 (wattsMitani2001); parts withStopsPerWeek (same rule), perMaleFollowWeek, and maleParties (the Ngogo male-party protocol, reported beside, C6 review)',
    pool: 'ratio', poisson: true,
    compute: d => {
      const n = d.patrols.length, fd = followDays(d);
      // part: effort counted on adult-male follows only (patrols are seen when the followed party is a male party)
      const maleDays = d.rec.follows.filter(f => f.end > f.start && f.sex === 'male').length, onMale = d.patrols.filter(p => d.rec.follows[p.follow].sex === 'male').length;
      const stops = d.patrols.filter(p => p.stops >= 2).length;
      return { value: fd ? n / fd * 7 : null, num: n, den: fd / 7, n, parts: { perMaleFollowWeek: maleDays ? onMale / maleDays * 7 : null, withStopsPerWeek: fd ? stops / fd * 7 : null }, truth: d.rec.truth.patrols.length / (d.communityYears * 365 / 7) };
    },
  },
  {
    id: 'T-PAT-2', protocol: 'classified patrols joined per adult male (scan membership during the patrol) ÷ his community\'s follow days × 365 (langergraber2017)',
    compute: d => {
      const per = patrolMembers(d), rates: number[] = [], mid = d.days * 12;
      for (const troop of d.troops) {
        const fd = d.followDays.get(troop) ?? 0;
        if (!fd) continue;
        for (const id of d.adultMales(troop, mid)) rates.push((per.get(id) ?? 0) / fd * 365);
      }
      return rates.length ? { value: mean(rates), n: rates.length } : none('no adult males');
    },
  },
  {
    id: 'T-PAT-3', protocol: 'adult males seen on a classified patrol (scan membership) ÷ the community\'s adult males, mean over patrols (massaro2022)',
    compute: d => {
      const S = d.rec.scans, v: number[] = [];
      for (const p of d.patrols) {
        const ids = new Set<number>();
        for (const i of d.followScans[p.follow]) { const t = H(d, S.t.data[i]); if (t < p.t0 || t > p.t1) continue; for (let k = 0; k < S.memN.data[i]; k++) { const id = S.members.data[S.memOff.data[i] + k]; if (d.isAdultMale(id, t)) ids.add(id); } }
        const all = d.adultMales(p.troop, p.t0).length;
        if (ids.size && all) v.push(Math.min(1, ids.size / all));
      }
      return v.length ? { value: mean(v), n: v.length } : none('no classified patrol with a scan');
    },
  },
  {
    id: 'T-PAT-4', protocol: 'per follow-day logistic regression of a classified patrol on mean scan adult males, the month\'s phenology index and a maximally swollen female present (mitaniWatts2005)', pool: 'custom',
    compute: d => {
      const S = d.rec.scans, males: number[] = [], fruit: number[] = [], oes: number[] = [], y: number[] = [];
      const pf = new Set(d.patrols.map(p => p.follow));
      d.followScans.forEach((idx, f) => {
        if (idx.length < 8) return;
        let am = 0, sw = 0;
        for (const i of idx) { am += S.am.data[i]; if (S.swollen.data[i] > 0) sw = 1; }
        const m = d.month(Math.round(d.rec.follows[f].start / d.tH));
        males.push(am / idx.length); fruit.push(d.phen.get(m) ?? NaN); oes.push(sw); y.push(pf.has(f) ? 1 : 0);
      });
      return { value: null, n: y.length, raw: { males, fruit, oes, y } };
    },
    pooled: s => {
      const X: number[][] = [], y: number[] = [];
      for (const v of s) v.raw?.y.forEach((yy, i) => { if (finite(v.raw!.fruit[i])) { X.push([v.raw!.males[i], v.raw!.fruit[i], v.raw!.oes[i]]); y.push(yy); } });
      if (y.filter(v => v).length < 10) return none('needs >= 10 patrol days', y.length);
      const f = logistic(X, y);
      const pass = f.beta[1] > 0 && f.beta[2] > 0 && Math.abs(f.beta[3]) < 2 * f.se[3];
      return { value: f.beta[1], parts: { males: f.beta[1], fruit: f.beta[2], oestrous: f.beta[3], seOestrous: f.se[3] }, n: y.length, pass };
    },
  },
  {
    id: 'T-PAT-5', protocol: 'duration of classified patrols (min); path length from 1-min positions as a part (km field-equivalent) (amsler2010)',
    compute: d => {
      const tp = d.rec.truth.patrols.filter(p => p.t1 > p.t0).map(p => (p.t1 - p.t0) * 60);
      return d.patrols.length ? { value: mean(d.patrols.map(p => p.minutes)), parts: { km: mean(d.patrols.map(p => p.pathM)) * d.profile.lengthScale / 1000 }, n: d.patrols.length, truth: tp.length ? mean(tp) : null } : none('no classified patrols');
    },
  },
  {
    id: 'T-PAT-6', protocol: 'share of classified patrols whose path enters a neighbour\'s 95% kernel isopleth (mitaniWatts2005)', pool: 'ratio',
    compute: d => {
      const P = d.rec.points;
      let inc = 0;
      for (const p of d.patrols) {
        let hit = false;
        for (const i of d.followPts[p.follow]) { if (i < p.i0 || i > p.i1) continue; for (const t of d.troops) if (t !== p.troop && d.level(t, P.x.data[i], P.z.data[i]) <= 0.95) { hit = true; break; } if (hit) break; }
        if (hit) inc++;
      }
      return { value: d.patrols.length ? inc / d.patrols.length : null, num: inc, den: d.patrols.length, n: d.patrols.length };
    },
  },
  {
    id: 'T-PAT-7', protocol: 'share of classified patrols with a seen or physical encounter during the patrol (watts2006)', pool: 'ratio',
    compute: d => {
      let c = 0;
      for (const p of d.patrols) if (d.rec.encounters.some(e => e.team === p.team && e.modality !== 'heard' && e.t0 <= p.t1 && e.t1 >= p.t0)) c++;
      return { value: d.patrols.length ? c / d.patrols.length : null, num: c, den: d.patrols.length, n: d.patrols.length };
    },
  },

  // C6 patrol corrections, P5 held-outs and the A1 check (docs/realism-design.md §5.3.1)
  {
    id: 'T-PAT-8', protocol: 'classified patrols on focal follows per community-month (>= 5 follow-days) ÷ follow-days × 30, Spearman rho against environment.fruitIndex of the month; community-months of all seeds pooled, >= 24 community-months and >= 10 patrols (langergraber2017 × potts2020 rule, §5.3.1 P5); truth: the same with every simulated patrol per 30 d', pool: 'custom',
    compute: d => {
      const fruit = new Map<number, number>();
      d.rec.fruitMonth.forEach((m, i) => fruit.set(m, d.rec.fruitIndex[i]));
      const days = new Map<string, number>(), pats = new Map<string, number>(), truth = new Map<string, number>();
      const key = (troop: number, h: number) => `${troop}|${Math.floor(h / MONTH_H)}`;
      for (const f of d.rec.follows) if (f.end > f.start) { const k = key(f.troop, f.start); days.set(k, (days.get(k) ?? 0) + 1); }
      for (const p of d.patrols) { const k = key(p.troop, d.rec.follows[p.follow].start); pats.set(k, (pats.get(k) ?? 0) + 1); }
      for (const p of d.rec.truth.patrols) { const k = key(p.troop, p.t0); truth.set(k, (truth.get(k) ?? 0) + 1); }
      const rate: number[] = [], fi: number[] = [], trate: number[] = [], tfi: number[] = [], n: number[] = [];
      for (const [k, fd] of days) {
        const f = fruit.get(+k.split('|')[1]);
        if (f === undefined) continue;
        trate.push((truth.get(k) ?? 0) / (MONTH_H / 24) * 30); tfi.push(f);
        if (fd < 5) continue;
        rate.push((pats.get(k) ?? 0) / fd * 30); fi.push(f); n.push(pats.get(k) ?? 0);
      }
      return { value: null, n: rate.length, raw: { rate, fi, n, trate, tfi } };
    },
    pooled: s => {
      const rate = s.flatMap(v => v.raw?.rate ?? []), fi = s.flatMap(v => v.raw?.fi ?? []), n = s.flatMap(v => v.raw?.n ?? []).reduce((a, b) => a + b, 0);
      const trate = s.flatMap(v => v.raw?.trate ?? []), tfi = s.flatMap(v => v.raw?.tfi ?? []);
      const truth = trate.length >= 24 ? spearman(trate, tfi) : null;
      if (rate.length < 24 || n < 10) return { ...none(`needs >= 24 community-months and >= 10 classified patrols (${rate.length}, ${n})`, rate.length), truth };
      return { value: spearman(rate, fi), n: rate.length, parts: { patrols: n, meanRatePer30d: mean(rate) }, truth };
    },
  },
  {
    id: 'T-BRD-1', protocol: 'halts of the focal (still < 0.2 m per 1-min sample, >= 1 min, entered from travel, not feeding) at 0.8–1.0 of the own equal-area 95% radius from the own range centroid; advance = net displacement over the 30 min after the halt toward the centroid of the nearest neighbour range (distance to centroid minus its equal-area 95% radius); logistic slope of advance on adults present (adult males + adult females, nearest scan within 15 min); halts of all seeds pooled, >= 50 with >= 10 of each outcome (lemoine2023 S3 Data, §5.3.1 P5)', pool: 'custom',
    compute: d => {
      const P = d.rec.points, S = d.rec.scans, adults: number[] = [], adv: number[] = [], onPatrol: number[] = [];
      const geo = new Map<number, { cx: number; cz: number; r: number }>();
      for (const [t, r] of d.ranges) if (r.fixes > 0 && r.area95 > 0) geo.set(t, { cx: r.cx, cz: r.cz, r: Math.sqrt(r.area95 / Math.PI) });
      const after = Math.round(0.5 / d.tH), slack = Math.round(5 / 60 / d.tH), near = Math.round(0.25 / d.tH);
      d.followPts.forEach((pts, f) => {
        const own = geo.get(d.rec.follows[f].troop);
        if (!own || pts.length < 3) return;
        const scans = d.followScans[f];
        const still = (a: number, b: number) => Math.hypot(P.x.data[b] - P.x.data[a], P.z.data[b] - P.z.data[a]) < 0.2;
        for (let r = 2; r < pts.length; r++) {
          const i = pts[r], h = pts[r - 1];
          // a halt starts at h (the focal travelled into it from pts[r - 2]) and lasts while it stays put
          if (!still(h, i) || still(pts[r - 2], h) || P.cat.data[pts[r - 2]] !== CAT_TRAVEL || P.cat.data[i] === CAT_FEED) continue;
          let e = r;
          while (e + 1 < pts.length && still(pts[e], pts[e + 1])) e++;
          const x = P.x.data[h], z = P.z.data[h], u = Math.hypot(x - own.cx, z - own.cz) / own.r;
          const end = pts[e], tEnd = P.t.data[end];
          r = e;
          if (u < 0.8 || u > 1) continue;
          let k = e;
          while (k + 1 < pts.length && P.t.data[pts[k]] < tEnd + after) k++;
          const later = pts[k];
          if (P.t.data[later] < tEnd + after || P.t.data[later] > tEnd + after + slack) continue;
          let nb: { cx: number; cz: number } | null = null, best = Infinity;
          for (const [t, g] of geo) { if (t === d.rec.follows[f].troop) continue; const v = Math.hypot(x - g.cx, z - g.cz) - g.r; if (v < best) { best = v; nb = g; } }
          if (!nb) continue;
          let sc = -1, sd = Infinity;
          for (const j of scans) { const dt = Math.abs(S.t.data[j] - P.t.data[h]); if (dt < sd) { sd = dt; sc = j; } }
          if (sc < 0 || sd > near) continue;
          const ex = P.x.data[end], ez = P.z.data[end], tx = nb.cx - ex, tz = nb.cz - ez, l = Math.hypot(tx, tz) || 1;
          adv.push(((P.x.data[later] - ex) * tx + (P.z.data[later] - ez) * tz) / l > 0 ? 1 : 0);
          adults.push(S.am.data[sc] + S.af.data[sc]);
          onPatrol.push(P.truthPatrol.data[h] ? 1 : 0);
        }
      });
      return { value: null, n: adv.length, raw: { adults, adv, onPatrol } };
    },
    pooled: s => {
      const x = s.flatMap(v => v.raw?.adults ?? []), y = s.flatMap(v => v.raw?.adv ?? []), pt = s.flatMap(v => v.raw?.onPatrol ?? []);
      const k = y.reduce((a, b) => a + b, 0);
      if (y.length < 50 || k < 10 || y.length - k < 10) return none(`needs >= 50 halts with >= 10 of each outcome (${y.length} halts, ${k} advances)`, y.length);
      const f = logistic(x.map(v => [v]), y);
      return { value: f.converged ? f.beta[1] : null, n: y.length, parts: { share: k / y.length, seSlope: f.se[1], meanAdults: mean(x), onPatrolShare: mean(pt) } };
    },
  },
  {
    id: 'T-PAT-9', protocol: 'simulation truth: per community-year with >= 3 patrols, the top sector gets >= 1/3 of patrols and a sector facing a neighbour at some patrol start that year goes >= 100 d without a patrol within the year; value = share of community-years meeting both (wattsMitani2001; encoded-descriptive check, Amendment A)', pool: 'custom',
    compute: d => {
      const Y = 365 * 24, groups = new Map<string, { t: number; sector: number; facing: number[] }[]>();
      for (const p of d.rec.truth.patrols) { if (p.sector < 0) continue; const y = Math.floor((p.t0 - d.rec.time0) / Y); if (y < 0 || (y + 1) * Y > d.days * 24 + 1e-6) continue; const k = `${p.troop}|${y}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push({ t: p.t0, sector: p.sector, facing: p.facing }); }
      const ok: number[] = [], top: number[] = [];
      for (const [k, ps] of groups) {
        if (ps.length < 3) continue;
        const y0 = d.rec.time0 + +k.split('|')[1] * Y, count = new Map<number, number>(), facing = new Set<number>();
        for (const p of ps) { count.set(p.sector, (count.get(p.sector) ?? 0) + 1); for (const q of p.facing) facing.add(q); }
        const share = Math.max(...count.values()) / ps.length;
        let neglect = false;
        for (const q of facing) {
          const ts = [y0, ...ps.filter(p => p.sector === q).map(p => p.t).sort((a, b) => a - b), y0 + Y];
          for (let i = 1; i < ts.length; i++) if (ts[i] - ts[i - 1] >= 100 * 24) { neglect = true; break; }
          if (neglect) break;
        }
        top.push(share); ok.push(share >= 1 / 3 && neglect ? 1 : 0);
      }
      return { value: null, n: ok.length, raw: { ok, top } };
    },
    pooled: s => {
      const ok = s.flatMap(v => v.raw?.ok ?? []), top = s.flatMap(v => v.raw?.top ?? []);
      return ok.length ? { value: mean(ok), n: ok.length, parts: { topSectorShare: mean(top) } } : none('no community-year with >= 3 patrols (needs whole years of observation)');
    },
  },

  // Lethal aggression
  {
    id: 'T-LET-1', protocol: 'observed killings (seen or heard by a team) plus inferred ones (carcasses found by the census with a violent cause; necropsy stand-in), ÷ community-years (wilson2014 "observed + inferred"); part: suspected = 30-day disappearances whose true cause was violent (wilson2014 counts these only as "suspected")',
    pool: 'ratio', poisson: true,
    compute: d => { const n = killings(d).length, sus = suspectedKillings(d); return { value: n / d.communityYears, num: n, den: d.communityYears, n, truth: d.rec.truth.killings / d.communityYears, parts: { suspectedPerYear: sus / d.communityYears } }; },
  },
  {
    id: 'T-LET-2', protocol: 'male share of victims of observed and inferred killings (wilson2014)', pool: 'ratio',
    compute: d => { const k = killings(d); const m = k.filter(x => d.roster.get(x.victim)?.sex === 'male').length; return k.length ? { value: m / k.length, num: m, den: k.length, n: k.length } : none('no killings', 0); },
  },
  {
    id: 'T-LET-3', protocol: 'median attackers ÷ max(1, victim-community adult males within 2× visibility) over observed and inferred killings (wilson2014)', pool: 'custom',
    compute: d => { const seen = new Set(killings(d).map(k => k.victim)), k = d.rec.truth.kills.filter(x => seen.has(x.victim)); return { value: null, n: k.length, raw: { ratio: k.map(x => x.attackers.length / Math.max(1, x.defenders)) } }; },
    pooled: s => { const v = s.flatMap(x => x.raw?.ratio ?? []); return v.length ? { value: median(v), n: v.length } : none('no killings'); },
  },
  { id: 'T-LET-4', protocol: 'range gain after killings (scenario)', na: 'ranges are fixed circles that relax back after a killing; living territories and the expansion scenario arrive in C6' },
  { id: 'T-LET-5', protocol: 'fertility and infant survival after expansion (scenario)', na: 'no expansion scenario or territory-dependent fertility (C6, C8)' },
  {
    id: 'T-LET-6', protocol: 'share of observed killings that happened during a classified patrol of the observing team (mitani2010)', pool: 'ratio',
    compute: d => {
      const k = d.rec.events.filter(e => (e.kind === 'kill' || e.kind === 'infanticide'));
      if (!k.length) return none('no observed killings');
      const on = k.filter(e => d.patrols.some(p => p.team === e.team && e.t >= p.t0 - 1 / 60 && e.t <= p.t1 + 1 / 60)).length;
      return { value: on / k.length, num: on, den: k.length, n: k.length };
    },
  },

  // Fission
  // Fission (stage C9): scored from simulation truth by scripts/c9-scenario.ts (40-year scenarios, fissionOn 1); fission is off in these runs
  { id: 'T-FIS-1', protocol: 'fissions per community-year by adult-male class (scenario)', na: 'scored by scripts/c9-scenario.ts (baseline and large-community scenarios; fissionOn is off by default)' },
  { id: 'T-FIS-2', protocol: 'years of rising yearly mean modularity before the split condition first held (scenario)', na: 'scored by scripts/c9-scenario.ts (large-community scenario)' },
  { id: 'T-FIS-3', protocol: 'killings between daughters in 7 years after the split / paired baseline intercommunity rate (scenario)', na: 'scored by scripts/c9-scenario.ts (large and large-off scenarios)' },
  { id: 'T-FIS-4', protocol: 'victims killed by the other daughter with a former associate among the killers (scenario)', na: 'scored by scripts/c9-scenario.ts (large-community scenario)' },
  { id: 'T-FIS-5', protocol: 'post-split patrols per 10 adult males, smaller / larger daughter (scenario)', na: 'scored by scripts/c9-scenario.ts (large-community scenario)' },

  // Food
  {
    id: 'T-FOOD-1', protocol: 'monthly transect of up to 20 trees per species: share with a crop the chimps feed in (fruit >= 0.06, src/sim/perception.ts), mean of months (potts2020)',
    compute: d => { const v = [...d.phen.values()]; return v.length ? { value: mean(v), n: v.length } : none('no transect'); },
  },
  {
    id: 'T-FOOD-2', protocol: 'focal point samples: fruit ÷ (fruit + ground foods + meat) feeding samples per individual-month (>= 30 feeding samples), mean (watts2012a)',
    compute: d => { const v = fruitShares(d); return v.size ? { value: mean([...v.values()].map(x => x[0])), n: v.size } : none('no feeding samples'); },
  },
  {
    id: 'T-FOOD-3', protocol: 'Pearson r of the monthly fruit share of feeding (pooled focal samples) with the monthly phenology index (watts2012b)',
    compute: d => {
      const P = d.rec.points, m = new Map<number, [number, number]>();
      for (let i = 0; i < P.t.n; i++) { const f = P.feed.data[i]; if (f !== FEED_FRUIT && f !== FEED_GROUND && f !== FEED_MEAT) continue; const k = d.month(P.t.data[i]); const v = m.get(k) ?? [0, 0]; v[1]++; if (f === FEED_FRUIT) v[0]++; m.set(k, v); }
      const x: number[] = [], y: number[] = [];
      for (const [k, [a, n]] of m) if (d.phen.has(k) && n >= 30) { x.push(d.phen.get(k)!); y.push(a / n); }
      return x.length >= 4 ? { value: pearson(x, y), n: x.length } : none('needs >= 4 months');
    },
  },
  {
    id: 'T-FOOD-4', protocol: 'feeding-tree visits per complete follow (focal continuous recording; a return to the same tree after >= 10 min counts again) (janmaat2013b)',
    compute: d => {
      const v: number[] = [];
      for (const f of d.rec.follows) if (f.complete) v.push(d.rec.visits.filter(x => x.team === f.team && x.t >= f.start && x.t <= f.end).length);
      return v.length ? { value: mean(v), n: v.length } : none('no complete follows');
    },
  },
  {
    id: 'T-FOOD-5', protocol: 'share of feeding-tree visits where the tree was the nearest productive tree (fruit >= 0.06) to where the focal left its previous tree (normand2009)', pool: 'ratio',
    compute: d => { const v = d.rec.visits, n = v.filter(x => x.nearest).length; return v.length ? { value: n / v.length, num: n, den: v.length, n: v.length } : none('no visits'); },
  },
  {
    id: 'T-FOOD-6', protocol: 'days between visits to the same tree by followed focals of one community (visits on different days) (normand2009; ban2014)',
    compute: d => {
      const last = new Map<string, number>(), gaps: number[] = [];
      for (const v of d.rec.visits) {
        const k = `${d.troops[v.team]}|${v.tree}`, day = Math.floor((v.t + 6.5) / 24), l = last.get(k);
        if (l !== undefined && day > l) gaps.push(day - l);
        last.set(k, day);
      }
      return gaps.length ? { value: mean(gaps), n: gaps.length } : none('no revisits');
    },
  },
  {
    id: 'T-FOOD-7', protocol: 'median distance to feeding trees that were beyond crown-detection distance at departure (m field-equivalent) (ban2014)', scaleSensitive: true,
    compute: d => { const v = d.rec.visits.filter(x => x.outOfSight).map(x => x.dist * d.profile.lengthScale); return v.length ? { value: median(v), n: v.length } : none('no out-of-sight approaches'); },
  },
  { id: 'T-FOOD-8', protocol: 'goal-directed inspections of empty trees', na: 'no species phenology beliefs or inspection behaviour (C7)' },
  { id: 'T-FOOD-9', protocol: 'approach speed profile near the goal', na: 'movement speed does not change near a goal (C7 approach kinematics)' },
  {
    id: 'T-FOOD-10', protocol: 'share of follows whose focal left its night nest before sunrise; part: first feeding tree = nest tree (janmaat2014)', pool: 'ratio',
    compute: d => {
      const f = d.rec.follows.filter(x => x.end > x.start);
      const early = f.filter(x => ((x.start + 6.5) % 24) < x.sunrise).length, nestTree = f.filter(x => x.firstTree >= 0 && x.firstTree === x.nestTree).length;
      return f.length ? { value: early / f.length, num: early, den: f.length, parts: { breakfastInNestTree: nestTree / f.length }, n: f.length } : none('no follows');
    },
  },
  {
    id: 'T-FOOD-11', protocol: 'monthly transect walks (4 range diameters per community): walk length (field-equivalent m) ÷ fruiting trees within crown-detection distance, annual mean of months (janmaat2016)', scaleSensitive: true,
    compute: d => {
      const m = new Map<number, [number, number]>();
      for (const t of d.rec.transects) { const v = m.get(t.month) ?? [0, 0]; v[0] += t.lengthM; v[1] += t.fruiting; m.set(t.month, v); }
      const v = [...m.values()].filter(x => x[1] > 0).map(x => x[0] * d.profile.lengthScale / x[1]);
      return v.length ? { value: mean(v), n: v.length } : none('no transects');
    },
  },

  // Hunting
  {
    id: 'T-HUN-1', protocol: 'hunts seen or heard by a following team ÷ community-days with a follow × 365 (gilby2015); part per 100 follow-hours (Kanyawara ≈ 0.29, derived: 194 hunts, 2,461 encounters at 3.73 per 100 h)', pool: 'ratio', poisson: true,
    compute: d => { const n = hunts(d).length, fd = followDays(d); return { value: fd ? n / fd * 365 : null, num: n, den: fd / 365, n, truth: d.rec.truth.hunts / d.communityYears, parts: { per100h: per100h(n, d) } }; },
  },
  {
    id: 'T-HUN-2', protocol: 'share of observed hunts with at least one capture (gilby2015)', pool: 'ratio',
    compute: d => { const h = hunts(d), s = h.filter(x => x.captures > 0).length; const T = d.rec.truth; return h.length ? { value: s / h.length, num: s, den: h.length, n: h.length, truth: T.hunts ? T.huntSuccesses / T.hunts : null } : none('no observed hunts'); },
  },
  {
    id: 'T-HUN-3', protocol: 'colobus encounters = prey within the profile encounter distance of the focal party at a 15-min scan; share followed by an observed hunt on that group within 1 h (gilby2015)', pool: 'ratio',
    compute: d => { const e = colobusEncounters(d), h = e.filter(x => x.hunted).length; return e.length ? { value: h / e.length, num: h, den: e.length, n: e.length, parts: { encountersPer100h: per100h(e.length, d) } } : none('no colobus encounters'); },
  },
  {
    id: 'T-HUN-4', protocol: 'logistic regression of hunting per colobus encounter on adult males in the scan; odds ratio per male (gilby2015)', pool: 'custom',
    compute: d => { const e = colobusEncounters(d); return { value: null, n: e.length, raw: { am: e.map(x => x.am), y: e.map(x => (x.hunted ? 1 : 0)) } }; },
    pooled: s => {
      const X: number[][] = [], y: number[] = [];
      for (const v of s) v.raw?.am.forEach((a, i) => { X.push([a]); y.push(v.raw!.y[i]); });
      if (y.length < 20 || !y.some(v => v) || y.every(v => v)) return none('needs >= 20 encounters with both outcomes', y.length);
      const f = logistic(X, y);
      return { value: Math.exp(f.beta[1]), parts: { beta: f.beta[1], se: f.se[1] }, n: y.length };
    },
  },
  {
    id: 'T-HUN-5', protocol: 'r² of observed hunts per follow-day by month against the monthly phenology index, positive slope required (wattsMitani2002)', pool: 'pattern',
    compute: d => {
      const hm = new Map<number, number>(), fm = new Map<number, number>();
      for (const h of hunts(d)) { const m = Math.floor(h.t0 / MONTH_H); hm.set(m, (hm.get(m) ?? 0) + 1); }
      for (const f of d.rec.follows) { const m = Math.floor(f.start / MONTH_H); fm.set(m, (fm.get(m) ?? 0) + 1); }
      const x: number[] = [], y: number[] = [];
      for (const [m, n] of fm) if (d.phen.has(m) && n > 0) { x.push(d.phen.get(m)!); y.push((hm.get(m) ?? 0) / n); }
      if (x.length < 6 || y.every(v => v === 0)) return none('needs >= 6 months with hunts');
      const f = ols(x, y);
      return { value: f.r2, parts: { slope: f.slope }, n: x.length, pass: f.slope > 0 && f.r2 >= 0.1 };
    },
  },
  {
    id: 'T-HUN-6', protocol: 'variance ÷ mean of monthly observed hunt counts per community, mean over communities with hunts (stanford1994)',
    compute: d => {
      const months = Math.max(1, Math.floor(d.days * 24 / MONTH_H)), v: number[] = [];
      for (const troop of d.troops) {
        const c = new Array(months).fill(0);
        for (const h of hunts(d)) if (h.troop === troop) { const m = Math.floor(h.t0 / MONTH_H); if (m < months) c[m]++; }
        if (c.some(x => x > 0)) v.push(dispersion(c));
      }
      return v.length ? { value: mean(v), n: v.length } : none('no hunts');
    },
  },
  {
    id: 'T-HUN-7', protocol: 'captures per successful observed hunt (gilby2015)', pool: 'ratio',
    compute: d => { const s = hunts(d).filter(h => h.captures > 0), c = s.reduce((a, h) => a + h.captures, 0); return s.length ? { value: c / s.length, num: c, den: s.length, n: s.length } : none('no successful hunts'); },
  },
  {
    id: 'T-HUN-8', protocol: 'share of captors in observed hunts who are adult males (mitaniWatts1999)', pool: 'ratio',
    compute: d => {
      const c = hunts(d).flatMap(h => h.captors.map(id => ({ id, t: h.t1 }))), m = c.filter(x => d.isAdultMale(x.id, x.t)).length;
      return c.length ? { value: m / c.length, num: m, den: c.length, n: c.length } : none('no captures');
    },
  },
  {
    id: 'T-HUN-9', protocol: 'independent individuals in the focal party at a successful hunt who ate meat within 3 h (captor or share received), and share rate to the holder\'s top-3 grooming partners ÷ others present (samuni2018)', pool: 'pattern',
    compute: d => {
      const g = groomHours(d), top = new Map<number, Set<number>>();
      const partners = new Map<number, Map<number, number>>();
      for (const [k, h] of g) { const [a, b] = k.split('>').map(Number); for (const [x, y] of [[a, b], [b, a]]) { let m = partners.get(x); if (!m) partners.set(x, m = new Map()); m.set(y, (m.get(y) ?? 0) + h); } }
      for (const [id, m] of partners) top.set(id, new Set([...m].sort((p, q) => q[1] - p[1] || p[0] - q[0]).slice(0, 3).map(x => x[0])));
      let present = 0, ate = 0, bondGot = 0, bondN = 0, otherGot = 0, otherN = 0;
      for (const h of hunts(d)) {
        if (!h.captures) continue;
        const eaters = new Set<number>(h.captors);
        const shares = d.rec.events.filter(e => e.kind === 'share' && e.troop === h.troop && e.t >= h.t1 && e.t <= h.t1 + 3);
        for (const e of shares) eaters.add(e.target);
        const pres = h.present.filter(id => d.ageAt(id, h.t1) >= 5);
        for (const id of pres) {
          present++; if (eaters.has(id)) ate++;
          for (const cap of h.captors) { if (id === cap) continue; const bonded = top.get(cap)?.has(id) ?? false; const got = shares.some(e => e.actor === cap && e.target === id); if (bonded) { bondN++; if (got) bondGot++; } else { otherN++; if (got) otherGot++; } }
        }
      }
      if (present < 5) return none('needs >= 5 individuals present at captures', present);
      const eat = ate / present, favour = bondN && otherN && otherGot ? (bondGot / bondN) / (otherGot / otherN) : NaN;
      return { value: eat, parts: { ateShare: eat, bondFavour: finite(favour) ? favour : null }, n: present, pass: eat >= 0.3 && eat <= 0.7 && finite(favour) && favour >= 1.2 };
    },
  },
  { id: 'T-HUN-10', protocol: 'colobus decline under predation (scenario)', na: 'prey groups have no demography (C7)' },

  // Social
  {
    id: 'T-SOC-1', protocol: 'longest run of years each adult male keeps a strong 5 m proximity bond (mitani2009)',
    compute: d => d.years < 2 ? none('needs >= 2 years (10-year runs in the design)') : bondRuns(d),
  },
  {
    id: 'T-SOC-2', protocol: 'adult male focal scans: 5 m proximity index to each other adult male; strongest partner above the 97.5% binomial tail; share of males whose strongest bond is not maternal kin (mitani2009)', pool: 'ratio',
    compute: d => {
      const b = strongBonds(d);
      const n = b.length, nk = b.filter(x => !maternalKin(d, x.a, x.b)).length;
      return n ? { value: nk / n, num: nk, den: n, n } : none('no male with a strong bond');
    },
  },
  {
    id: 'T-SOC-3', protocol: 'OLS slope of grooming given (h) on grooming received over ordered adult-male dyads, detected bouts with known ends (kaburuNewtonFisher2015 studied adult males; approximate: the source fitted an LMM on log durations with rank, support, association and aggression as covariates)',
    compute: d => {
      const g = groomHours(d), x: number[] = [], y: number[] = [];
      const seen = new Set<string>(), mid = d.days * 12, males = new Set(d.troops.flatMap(t => d.adultMales(t, mid)).map(String));
      for (const k of g.keys()) { const [a, b] = k.split('>'); if (!males.has(a) || !males.has(b)) continue; for (const [p, q] of [[a, b], [b, a]]) { const kk = `${p}>${q}`; if (seen.has(kk)) continue; seen.add(kk); y.push(g.get(kk) ?? 0); x.push(g.get(`${q}>${p}`) ?? 0); } }
      return x.length >= 10 ? { value: ols(x, y).slope, n: x.length } : none('needs >= 10 dyads');
    },
  },
  {
    id: 'T-SOC-4', protocol: '15-min scans: half-weight index for adult female dyads (co-membership in the focal party), mean; male mean HWI must exceed it (foerster2015; gilbyWrangham2008)', pool: 'pattern',
    compute: d => {
      const S = d.rec.scans, mid = d.days * 12;
      const res: Record<string, number | null> = {};
      for (const sex of ['female', 'male'] as const) {
        const v: number[] = [];
        for (const troop of d.troops) {
          const ids = d.rec.roster.filter(r => r.troop === troop && r.sex === sex && d.aliveAt(r.id, mid) && d.ageAt(r.id, mid) >= 15).map(r => r.id);
          const k = new Map(ids.map((id, i) => [id, i]));
          const seen = new Array(ids.length).fill(0), both = ids.map(() => new Array(ids.length).fill(0));
          for (let i = 0; i < S.t.n; i++) {
            const pres: number[] = [];
            for (let j = 0; j < S.memN.data[i]; j++) { const q = k.get(S.members.data[S.memOff.data[i] + j]); if (q !== undefined) pres.push(q); }
            for (const a of pres) seen[a]++;
            for (let a = 0; a < pres.length; a++) for (let b = a + 1; b < pres.length; b++) { both[pres[a]][pres[b]]++; both[pres[b]][pres[a]]++; }
          }
          for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) { const x = both[a][b], h = hwi(x, seen[a] - x, seen[b] - x); if (finite(h)) v.push(h); }
        }
        res[sex] = v.length ? mean(v) : null;
      }
      if (res.female === null || res.male === null) return none('needs male and female dyads');
      return { value: res.female, parts: res, n: d.rec.scans.t.n, pass: res.female >= 0.1 && res.female <= 0.3 && res.male > res.female };
    },
  },
  {
    id: 'T-SOC-5', protocol: 'hierarchy steepness (David\'s scores corrected for chance, de Vries 2006) from detected decided agonistic interactions among adult males, mean over communities with >= 3 males (kaburuNewtonFisher2015 used aggressive interactions); part: with pant-grunts added',
    compute: d => {
      const st = (m: Map<number, { ids: number[]; wins: number[][] }>) => [...m.values()].filter(x => x.ids.length >= 3).map(x => steepness(x.wins).steepness).filter(finite);
      const v = st(maleDominance(d, true)), pg = st(maleDominance(d));
      return v.length ? { value: mean(v), n: v.length, parts: { withPantGrunts: pg.length ? mean(pg) : null } } : none('no community with 3 males');
    },
  },
  {
    id: 'T-SOC-6', protocol: 'share of detected pant-grunts in the community received by its top 3 males (observed David\'s scores), communities with >= 5 adult males (gilby2013)',
    compute: d => {
      const ranks = maleRanks(d), v: number[] = [];
      for (const m of maleDominance(d).values()) {
        if (m.ids.length < 5 || !m.allPG) continue;
        let top = 0; for (const id of m.ids) if ((ranks.get(id) ?? 99) <= 3) top += m.pantGrunts.get(id) ?? 0;
        v.push(top / m.allPG);
      }
      return v.length ? { value: mean(v), n: v.length } : none('no community with >= 5 adult males');
    },
  },
  {
    id: 'T-SOC-7', protocol: 'community-years ÷ alpha changes from the daily alpha record (bray2016)', pool: 'custom',
    compute: d => { let ch = 0; const prev = new Map<number, number>(); for (const a of d.rec.alpha) { const p = prev.get(a.troop); if (p !== undefined && p !== a.id && a.id > 0) ch++; if (a.id > 0) prev.set(a.troop, a.id); } return { value: null, n: ch, num: ch, den: d.communityYears }; },
    pooled: s => {
      const ch = s.reduce((a, v) => a + (v.num ?? 0), 0), cy = s.reduce((a, v) => a + (v.den ?? 0), 0);
      return ch ? { value: cy / ch, n: ch, parts: { changes: ch, communityYears: cy } } : { value: null, n: 0, parts: { changes: 0, communityYears: cy }, note: `no alpha change in ${cy.toFixed(0)} community-years (tenure not estimable; consistent with multi-year tenures)` };
    },
  },
  {
    id: 'T-SOC-8', protocol: 'detected female–female decided conflicts won against the day\'s female order (0.02–0.2 required, ~10% reported) and lasting (>= 30 d) order reversals per female-year (<= 0.05) (foerster2016)', pool: 'pattern',
    compute: d => {
      const orderByDay = new Map<string, number[]>();
      for (const o of d.rec.femaleOrder) orderByDay.set(`${o.day}|${o.troop}`, o.ids);
      let n = 0, against = 0;
      for (const c of d.rec.conflicts) {
        if (!c.detected) continue;
        const w = d.roster.get(c.winner), l = d.roster.get(c.loser);
        if (w?.sex !== 'female' || l?.sex !== 'female') continue;
        const ids = orderByDay.get(`${Math.floor((c.t + 6.5) / 24) + 1}|${c.troop}`) ?? orderByDay.get(`${Math.floor((c.t + 6.5) / 24)}|${c.troop}`);
        if (!ids) continue;
        const a = ids.indexOf(c.winner), b = ids.indexOf(c.loser);
        if (a < 0 || b < 0) continue;
        n++; if (a > b) against++;
      }
      // lasting reversals: pairs whose relative order changes and stays changed for >= 30 days
      let reversals = 0, femaleYears = 0;
      for (const troop of d.troops) {
        const days = d.rec.femaleOrder.filter(o => o.troop === troop);
        if (days.length < 60) continue;
        femaleYears += mean(days.map(x => x.ids.length)) * days.length / 365;
        const first = days[0].ids;
        for (let i = 0; i < first.length; i++) for (let j = i + 1; j < first.length; j++) {
          const a = first[i], b = first[j];
          let flipAt = -1;
          for (let k = 1; k < days.length; k++) {
            const ia = days[k].ids.indexOf(a), ib = days[k].ids.indexOf(b);
            if (ia < 0 || ib < 0) break;
            if (ia > ib) { if (flipAt < 0) flipAt = k; if (k - flipAt >= 30) { reversals++; break; } } else flipAt = -1;
          }
        }
      }
      if (n < 5) return none('needs >= 5 detected female–female conflicts', n);
      const share = against / n, rate = femaleYears ? reversals / femaleYears : 0;
      // foerster2016: ~10% of contests go against rank, without lasting reversals
      return { value: share, parts: { againstRank: share, lastingReversalsPerFemaleYear: rate }, n, pass: share >= 0.02 && share <= 0.2 && rate <= 0.05 };
    },
  },
  {
    id: 'T-SOC-9', protocol: 'PC–MC: 10-min post-conflict window and a matched control at the same time on the next possible day with the opponent in view; corrected conciliatory tendency per individual (>= 3 pairs), mean of individuals (kutsukakeCastles2004)',
    compute: d => {
      const byInd = new Map<number, { pc: number; mc: number }[]>();
      for (const c of d.rec.conflicts) {
        if (!c.detected || c.mc === -2 || c.mc === -3) continue;
        for (const id of [c.winner, c.loser]) { let l = byInd.get(id); if (!l) byInd.set(id, l = []); l.push({ pc: c.pc, mc: c.mc }); }
      }
      const v = [...byInd.values()].filter(l => l.length >= 3).map(l => conciliatoryTendency(l).cct);
      const T = d.rec.truth;
      return v.length ? { value: mean(v), n: v.length, truth: T.conflicts ? T.reconciliations / T.conflicts : null, note: 'truth = reconciliation bouts ÷ decided conflicts (uncorrected)' } : none('no individual with >= 3 PC–MC pairs');
    },
  },
  {
    id: 'T-SOC-10', protocol: 'share of detected conflicts followed within 10 min by affiliation from a third party to either opponent; parts by recipient (wittigBoesch2010)', pool: 'ratio',
    compute: d => {
      const c = d.rec.conflicts.filter(x => x.detected);
      const any = c.filter(x => x.thirdToWinner || x.thirdToLoser).length;
      return c.length ? { value: any / c.length, num: any, den: c.length, parts: { toAggressor: c.filter(x => x.thirdToWinner).length, toVictim: c.filter(x => x.thirdToLoser).length }, n: c.length } : none('no detected conflicts');
    },
  },
  {
    id: 'T-SOC-11', protocol: 'genetic record (truth sire) of infants born during the run: share sired by the alpha of the mother\'s community at conception (birth − 227 d) (wroblewski2009)', pool: 'ratio',
    compute: d => {
      let n = 0, a = 0;
      for (const b of d.rec.births) {
        if (b.father <= 0) continue;
        const tc = b.truthBirth - 227 * 24, day = Math.floor((tc + 6.5) / 24) + 1;
        const rec = d.rec.alpha.filter(x => x.troop === b.troop);
        const at = rec.find(x => x.day >= day) ?? rec[rec.length - 1];
        if (!at) continue;
        n++; if (at.id === b.father) a++;
      }
      return n ? { value: a / n, num: a, den: n, n } : none('no sired births');
    },
  },
  {
    id: 'T-SOC-12', protocol: 'dyadic value (grooming h + coalition support) and compatibility (1 ÷ (1 + aggression)) from detected events; kin must score higher on both (fraser2008, captive, qualitative)', pool: 'pattern',
    compute: d => {
      const g = groomHours(d), agg = new Map<string, number>(), sup = new Map<string, number>();
      const key = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
      for (const e of d.rec.events) {
        if (e.target <= 0) continue;
        if (e.kind === 'charge' || e.kind === 'fight' || e.kind === 'display') agg.set(key(e.actor, e.target), (agg.get(key(e.actor, e.target)) ?? 0) + 1);
        if (e.kind === 'coalition' && e.parts.length >= 3) sup.set(key(e.parts[0], e.parts[1]), (sup.get(key(e.parts[0], e.parts[1])) ?? 0) + 1);
      }
      const dy = new Set<string>([...agg.keys(), ...sup.keys()]);
      for (const k of g.keys()) { const [a, b] = k.split('>').map(Number); dy.add(key(a, b)); }
      const kin = { v: [] as number[], c: [] as number[] }, non = { v: [] as number[], c: [] as number[] };
      for (const k of dy) {
        const [a, b] = k.split('|').map(Number);
        const v = (g.get(`${a}>${b}`) ?? 0) + (g.get(`${b}>${a}`) ?? 0) + (sup.get(k) ?? 0), c = 1 / (1 + (agg.get(k) ?? 0));
        const t = maternalKin(d, a, b) ? kin : non; t.v.push(v); t.c.push(c);
      }
      if (kin.v.length < 3 || non.v.length < 3) return none('needs kin and non-kin dyads');
      const pv = mean(kin.v) > mean(non.v), pc = mean(kin.c) > mean(non.c);
      return { value: mean(kin.v) / Math.max(1e-9, mean(non.v)), parts: { valueKin: mean(kin.v), valueNonKin: mean(non.v), compatKin: mean(kin.c), compatNonKin: mean(non.c) }, n: dy.size, pass: pv && pc };
    },
  },
  { id: 'T-SOC-13', protocol: 'structural test (digests)', structural: 'a former partner stays in yearly memory digests; covered by tests/sim-relations.test.ts, not an observer metric' },

  // Demography
  {
    id: 'T-DEM-1', protocol: 'census: first-year deaths ÷ infant-years of exposure from births the teams detected; q1 = 1 − exp(−h) (wood2017)', pool: 'custom',
    compute: d => { const lt = lifeTable(d); const dth = lt.dth.male[0] + lt.dth.female[0], ex = lt.exp.male[0] + lt.exp.female[0]; return { value: ex ? 1 - Math.exp(-dth / ex) : null, n: dth, num: dth, den: ex }; },
    pooled: s => {
      const dth = s.reduce((a, v) => a + (v.num ?? 0), 0), ex = s.reduce((a, v) => a + (v.den ?? 0), 0);
      if (ex < 3) return none(`only ${ex.toFixed(1)} infant-years`, dth);
      const [lo, hi] = poissonInterval(dth);
      return { value: 1 - Math.exp(-dth / ex), n: dth, parts: { deaths: dth, infantYears: ex }, interval: [1 - Math.exp(-lo / ex), 1 - Math.exp(-hi / ex)] };
    },
  },
  {
    id: 'T-DEM-2', protocol: 'census life table with estimated ages (±2 y for founders), piecewise-constant hazards from 15 y; e15 by sex (wood2017)', pool: 'custom', bandParts: ['female', 'male'],
    compute: d => { const lt = lifeTable(d); return { value: null, n: 0, raw: { em: lt.exp.male, ef: lt.exp.female, dm: lt.dth.male, df: lt.dth.female } }; },
    pooled: s => {
      const z = BINS.map(() => 0);
      let em = z, ef = z, dm = z, df = z;
      for (const v of s) if (v.raw) { em = addArr(em, v.raw.em); ef = addArr(ef, v.raw.ef); dm = addArr(dm, v.raw.dm); df = addArr(df, v.raw.df); }
      const adultDeaths = dm.slice(4).reduce((a, b) => a + b, 0) + df.slice(4).reduce((a, b) => a + b, 0);
      if (adultDeaths < 10) return none(`only ${adultDeaths} adult deaths (natural-aging demography needs decades; design C8: 40 years × 5 seeds)`, adultDeaths);
      const f = e15From(ef, df), m = e15From(em, dm);
      return { value: (f + m) / 2, parts: { female: f, male: m }, n: adultDeaths };
    },
  },
  {
    id: 'T-DEM-3', protocol: 'census life table: survival from birth to 45 y, both sexes (wood2017)', pool: 'custom',
    compute: d => { const lt = lifeTable(d); return { value: null, n: 0, raw: { e: addArr(lt.exp.male, lt.exp.female), d: addArr(lt.dth.male, lt.dth.female) } }; },
    pooled: s => {
      let e = BINS.map(() => 0), dd = BINS.map(() => 0);
      for (const v of s) if (v.raw) { e = addArr(e, v.raw.e); dd = addArr(dd, v.raw.d); }
      const n = dd.reduce((a, b) => a + b, 0);
      if (n < 20) return none(`only ${n} deaths`, n);
      let cum = 0;
      for (let i = 0; i < 10; i++) cum += (dd[i] / Math.max(1e-9, e[i])) * (BINS[i + 1] - BINS[i]);
      return { value: Math.exp(-cum), n };
    },
  },
  { id: 'T-DEM-4', protocol: 'causes of death', na: 'no disease or snare mortality; causes are not separated from the fitted all-cause hazard (C8)' },
  { id: 'T-DEM-5', protocol: 'epidemics per community-year', na: 'no epidemics (C8)' },
  { id: 'T-DEM-6', protocol: 'outbreak attack rate and mortality', na: 'no epidemics (C8)' },
  { id: 'T-DEM-7', protocol: 'who dies in epidemics', na: 'no epidemics (C8)' },
  { id: 'T-DEM-8', protocol: 'respiratory death rate', na: 'no respiratory disease (C8)' },
  { id: 'T-DEM-9', protocol: 'snare injury prevalence', na: 'no snares (C8)' },
  {
    id: 'T-DEM-10', protocol: 'census: detected births ÷ female-years at estimated ages 20–30 (emeryThompson2007)', pool: 'custom',
    compute: d => {
      let births = 0, fy = 0;
      const t1 = d.days * 24;
      for (const r of d.rec.roster) {
        if (r.sex !== 'female') continue;
        const from = r.firstSeen, dt = d.rec.deaths.find(x => x.id === r.id)?.tEst ?? t1, to = Math.min(t1, dt);
        const a0 = d.ageAt(r.id, from), a1 = d.ageAt(r.id, to), lo = Math.max(a0, 20), hi = Math.min(a1, 30);
        if (hi > lo) fy += hi - lo;
      }
      for (const b of d.rec.births) { const a = d.ageAt(b.mother, b.tSeen); if (a >= 20 && a < 30) births++; }
      return { value: fy ? births / fy : null, n: births, num: births, den: fy };
    },
    pooled: s => {
      const b = s.reduce((a, v) => a + (v.num ?? 0), 0), fy = s.reduce((a, v) => a + (v.den ?? 0), 0);
      if (fy < 10) return none('too few female-years');
      const [lo, hi] = poissonInterval(b);
      return { value: b / fy, n: b, parts: { births: b, femaleYears: fy }, interval: [lo / fy, hi / fy] };
    },
  },
  {
    id: 'T-DEM-11', protocol: 'census: estimated age of mothers at their first detected birth, only for females known to be nulliparous (born during the study, or first seen before an estimated 12 y; walker2018 used known-age females) and with no earlier offspring in the roster', pool: 'custom',
    compute: d => {
      const v: number[] = [];
      for (const b of d.rec.births) {
        const m = d.roster.get(b.mother);
        if (!m || !(m.knownAge || d.ageAt(m.id, m.firstSeen) < NULLIPAROUS_BEFORE_Y)) continue; // founders' earlier births are unknown (C3 review)
        const earlier = d.rec.roster.some(r => r.mother === b.mother && r.id !== b.id && r.firstSeen < b.tSeen); if (!earlier) v.push(d.ageAt(b.mother, b.tSeen));
      }
      return { value: v.length ? mean(v) : null, n: v.length, raw: { age: v } };
    },
    pooled: s => { const v = s.flatMap(x => x.raw?.age ?? []); return v.length >= 3 ? { value: mean(v), n: v.length } : none('fewer than 3 first births', v.length); },
  },
  {
    id: 'T-DEM-12', protocol: 'census: interval between successive detected births to one mother when the first infant survived (emeryThompson2007)', pool: 'custom',
    compute: d => ({ value: null, n: 0, raw: { ibi: interbirth(d, true) } }),
    pooled: s => { const v = s.flatMap(x => x.raw?.ibi ?? []); return v.length >= 3 ? { value: mean(v), n: v.length } : none('fewer than 3 intervals (needs multi-year runs)', v.length); },
  },
  {
    id: 'T-DEM-13', protocol: 'census: interval after the first infant died (emeryThompson2007)', pool: 'custom',
    compute: d => ({ value: null, n: 0, raw: { ibi: interbirth(d, false) } }),
    pooled: s => { const v = s.flatMap(x => x.raw?.ibi ?? []); return v.length >= 3 ? { value: mean(v), n: v.length } : none('fewer than 3 intervals (needs multi-year runs)', v.length); },
  },
  { id: 'T-DEM-14', protocol: 'female rank and fertility', na: 'no path from female rank to fertility or infant survival (C8)' },
  { id: 'T-DEM-15', protocol: 'maternal loss after weaning', na: 'no post-weaning maternal effects on sons (C8)' },

  // Communication
  {
    id: 'T-COM-1', protocol: 'pant-hoots given by adult male focals per follow hour, mean of individuals with >= 5 h (mitaniNishida1993)',
    compute: d => { const r = maleCallRates(d); return r.size ? { value: mean([...r.values()]), n: r.size } : none('no male focal hours'); },
  },
  {
    id: 'T-COM-2', protocol: 'Kendall τ between observed male rank number and focal pant-hoot rate, pooled; negative required (wilson2007)', pool: 'pattern',
    compute: d => {
      const r = maleCallRates(d), ranks = maleRanks(d), x: number[] = [], y: number[] = [];
      for (const [id, v] of r) if (ranks.has(id)) { x.push(ranks.get(id)!); y.push(v); }
      if (x.length < 4) return none('needs >= 4 ranked male focals');
      const t = kendall(x, y);
      return { value: t, n: x.length, pass: t < 0 };
    },
  },
  {
    id: 'T-COM-3', protocol: 'adult male focal pant-hoot rate in the periphery (beyond the own 85% isopleth) vs the core (wilson2007)', pool: 'pattern',
    compute: d => {
      const P = d.rec.points, calls = focalCalls(d, 'pant-hoot');
      let hc = 0, hp = 0, cc = 0, cp = 0;
      for (let i = 0; i < P.t.n; i++) {
        const id = P.focal.data[i];
        if (d.roster.get(id)?.sex !== 'male') continue;
        const troop = d.troops[P.team.data[i]];
        const periph = d.level(troop, P.x.data[i], P.z.data[i]) > 0.85;
        const n = calls.get(`${id}|${P.t.data[i]}`) ?? 0;
        if (periph) { hp++; cp += n; } else { hc++; cc += n; }
      }
      if (hp < 60 || hc < 60) return none('needs >= 1 h in each zone');
      const core = cc / (hc / 60), per = cp / (hp / 60);
      return { value: per - core, parts: { core, periphery: per }, n: hp + hc, pass: per < core };
    },
  },
  {
    id: 'T-COM-4', protocol: 'focal pant-hoots: the focal\'s category in the minute before calling (travel must be most common) and rate while feeding on fruit vs ground foods (mitaniNishida1993; wilson2007)', pool: 'pattern',
    compute: d => {
      // context: the focal's category at the last point sample before the call
      const P = d.rec.points, perMin = Math.round(1 / 60 / d.tH), catAt = new Map<string, number>();
      for (let i = 0; i < P.t.n; i++) catAt.set(`${P.focal.data[i]}|${P.t.data[i]}`, P.cat.data[i]);
      const ctx = [0, 0, 0, 0, 0, 0];
      for (const c of d.rec.calls) {
        if (c.kind !== 'pant-hoot') continue;
        const tick = Math.floor(c.t / d.tH / perMin - 1e-9) * perMin, k = catAt.get(`${c.caller}|${tick}`) ?? catAt.get(`${c.caller}|${tick - perMin}`);
        if (k !== undefined && k < 6) ctx[k]++;
      }
      const tot = ctx.reduce((a, b) => a + b, 0);
      if (tot < 10) return none('fewer than 10 focal pant-hoots');
      const calls = focalCalls(d, 'pant-hoot');
      let fruitMin = 0, fruitCalls = 0, groundMin = 0, groundCalls = 0;
      for (let i = 0; i < P.t.n; i++) { const f = P.feed.data[i], n = calls.get(`${P.focal.data[i]}|${P.t.data[i]}`) ?? 0; if (f === FEED_FRUIT) { fruitMin++; fruitCalls += n; } else if (f === FEED_GROUND) { groundMin++; groundCalls += n; } }
      const travelTop = ctx[CAT_TRAVEL] === Math.max(...ctx), fr = fruitMin ? fruitCalls / fruitMin * 60 : 0, gr = groundMin ? groundCalls / groundMin * 60 : 0;
      return { value: ctx[CAT_TRAVEL] / tot, parts: { travel: ctx[CAT_TRAVEL] / tot, feed: ctx[CAT_FEED] / tot, rest: ctx[CAT_REST] / tot, fruitRate: fr, groundRate: gr }, n: tot, pass: travelTop && fr > gr };
    },
  },
  {
    id: 'T-COM-5', protocol: 'bioacoustic recorder (stage C10): pant-hoots of adult males recorded within 10% of the hearing radius of a following team, one record per call; leave-one-out linear discriminant accuracy for caller identity over callers with >= 10 recorded calls, divided by chance (1 / callers); part community: the same calls classified by the caller\'s community (desai2022)',
    compute: d => {
      const byCaller = new Map<number, { f: number[]; troop: number }[]>(), seen = new Set<string>();
      for (const c of d.rec.calls) {
        if (c.kind !== 'pant-hoot' || !c.f || !d.isAdultMale(c.caller, c.t)) continue;
        const key = `${c.caller}|${c.t}`;
        if (seen.has(key)) continue;
        seen.add(key);
        (byCaller.get(c.caller) ?? byCaller.set(c.caller, []).get(c.caller)!).push({ f: c.f, troop: c.troop });
      }
      const X: number[][] = [], who: number[] = [], troop: number[] = [];
      for (const [id, l] of byCaller) if (l.length >= 10) for (const r of l) { X.push(r.f); who.push(id); troop.push(r.troop); }
      const callers = new Set(who).size;
      if (callers < 3) return none(`needs >= 3 callers with >= 10 recorded pant-hoots (${callers})`, X.length);
      const a = ldaLeaveOneOut(X, who), b = new Set(troop).size >= 2 ? ldaLeaveOneOut(X, troop) : null;
      return { value: a.accuracy / a.chance, n: X.length, parts: { callers, accuracy: a.accuracy, community: b ? b.accuracy / b.chance : null } };
    },
  },
  {
    id: 'T-COM-6', protocol: 'drums heard by a following team, one record per bout (stage C10): median hits per bout (intervals + 1) and mean inter-hit interval; pass when the median is 3-5 hits and no bout is by a female; parts: share of male bouts without the drummer\'s pant-hoot within 1 min (reported) (eleuteri2025; clarkArcadi2004)', pool: 'custom',
    compute: d => {
      const hits: number[] = [], iv: number[] = [], silent: number[] = [], female: number[] = [], seen = new Set<string>();
      for (const c of d.rec.calls) {
        if (c.kind !== 'drum' || !c.f) continue;
        const key = `${c.caller}|${c.t}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const sex = d.roster.get(c.caller)?.sex;
        hits.push(c.f.length + 1); for (const v of c.f) iv.push(v);
        female.push(sex === 'female' ? 1 : 0);
        if (sex === 'male') silent.push(d.calledNear(c.caller, c.t, ['pant-hoot'], 1 / 60, 1 / 60) ? 0 : 1);
      }
      return { value: null, n: hits.length, raw: { hits, iv, silent, female } };
    },
    pooled: s => {
      const hits = s.flatMap(v => v.raw?.hits ?? []), iv = s.flatMap(v => v.raw?.iv ?? []), silent = s.flatMap(v => v.raw?.silent ?? []), female = s.flatMap(v => v.raw?.female ?? []);
      if (hits.length < 20) return none(`needs >= 20 recorded drumming bouts (${hits.length})`, hits.length);
      const med = median(hits), fem = female.reduce((a, b) => a + b, 0);
      return { value: med, n: hits.length, parts: { meanIntervalMs: mean(iv), maleBoutsWithoutCall: silent.length ? mean(silent) : null, femaleBouts: fem }, pass: med >= 3 && med <= 5 && fem === 0 };
    },
  },
  {
    id: 'T-COM-7', protocol: 'logistic regression of a focal male drumming in a minute on party size; negative slope required (eleuteri2022)', pool: 'custom',
    compute: d => {
      // aggregated by party size: minutes and drumming minutes (binomial rows for a weighted logistic)
      const P = d.rec.points, drums = focalCalls(d, 'drum'), mins = new Map<number, [number, number]>();
      for (let i = 0; i < P.t.n; i++) {
        if (d.roster.get(P.focal.data[i])?.sex !== 'male') continue;
        const v = mins.get(P.party.data[i]) ?? [0, 0]; v[0]++; if ((drums.get(`${P.focal.data[i]}|${P.t.data[i]}`) ?? 0) > 0) v[1]++; mins.set(P.party.data[i], v);
      }
      const size = [...mins.keys()].sort((a, b) => a - b);
      return { value: null, n: size.reduce((a, k) => a + mins.get(k)![1], 0), raw: { size, minutes: size.map(k => mins.get(k)![0]), drums: size.map(k => mins.get(k)![1]) } };
    },
    pooled: s => {
      const X: number[][] = [], y: number[] = [], w: number[] = [];
      for (const v of s) v.raw?.size.forEach((a, i) => { const n = v.raw!.minutes[i], k = v.raw!.drums[i]; if (k) { X.push([a]); y.push(1); w.push(k); } if (n - k) { X.push([a]); y.push(0); w.push(n - k); } });
      const k = y.reduce((a, yy, i) => a + (yy ? w[i] : 0), 0);
      if (k < 10) return none('fewer than 10 focal drumming minutes', k);
      const f = logistic(X, y, 50, w);
      return { value: f.beta[1], parts: { se: f.se[1], drums: k }, n: k, pass: f.beta[1] < 0 };
    },
  },
  {
    id: 'T-COM-8', protocol: 'share of focal arrivals at fruiting trees with a food-grunt or pant-hoot by the focal within the arrival minute (kalanBoesch2015)', pool: 'ratio',
    compute: d => { const v = d.rec.visits, c = v.filter(x => d.calledNear(x.focal, x.t, ['food-grunt', 'pant-hoot'], 1.5 / 60, 0.5 / 60)).length; return v.length ? { value: c / v.length, num: c, den: v.length, n: v.length } : none('no arrivals'); },
  },
  {
    id: 'T-COM-9', protocol: 'arrival pant-hoots by focals: share from parties containing a top-2 ranked adult male (observed dominance); >= 0.9 required (clarkWrangham1994)', pool: 'pattern',
    compute: d => {
      const ranks = maleRanks(d), S = d.rec.scans;
      let n = 0, withTop = 0;
      for (const v of d.rec.visits) {
        const called = d.calledNear(v.focal, v.t, ['pant-hoot'], 1.5 / 60, 0.5 / 60);
        if (!called) continue;
        let best = -1, bd = Infinity;
        for (let i = 0; i < S.t.n; i++) { if (S.team.data[i] !== v.team) continue; const dt = Math.abs(H(d, S.t.data[i]) - v.t); if (dt < bd) { bd = dt; best = i; } }
        if (best < 0 || bd > 0.5) continue;
        n++;
        for (let k = 0; k < S.memN.data[best]; k++) if ((ranks.get(S.members.data[S.memOff.data[best] + k]) ?? 99) <= 2) { withTop++; break; }
      }
      return n >= 5 ? { value: withTop / n, n, pass: withTop / n >= 0.9 } : none('fewer than 5 arrival pant-hoots', n);
    },
  },
  { id: 'T-COM-10', protocol: 'gesture repertoire', na: 'no gestures (C10)' },
  {
    id: 'T-COM-11', protocol: 'snake-model trials on cloned worlds (4 m from a party, 30 min): share of individual encounters (community members within the 12 m detection distance) with alert hoos by that individual (crockford2012: 46/111); part: share of trials with any alert hoo', pool: 'ratio',
    compute: d => {
      const t = d.rec.experiments.filter(x => x.kind === 'snake'), met = t.reduce((a, x) => a + x.encountered, 0), c = t.reduce((a, x) => a + x.callers, 0);
      return met ? { value: c / met, num: c, den: met, n: met, parts: { trialsWithAlarm: t.filter(x => x.called).length / t.length } } : none('no individual snake encounters');
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers used above
// ---------------------------------------------------------------------------

function dayRange(d: Derived, who: 'male' | 'lact'): SeedValue {
  const P = d.rec.points, every = Math.round(5 / 60 / d.tH), every30 = Math.round(30 / 60 / d.tH), v: number[] = [], p30: number[] = [], net: number[] = [], straight: number[] = [];
  d.rec.follows.forEach((f, fi) => {
    if (!f.complete || f.end - f.start < 8) return;
    if (who === 'male' ? f.sex !== 'male' : !(f.sex === 'female' && f.lactating)) return;
    let px = NaN, pz = NaN, sum = 0, qx = NaN, qz = NaN, sum30 = 0, x0 = NaN, z0 = NaN, x1 = NaN, z1 = NaN;
    for (const i of d.followPts[fi]) {
      if (P.t.data[i] % every !== 0) continue;
      const x = P.x.data[i], z = P.z.data[i];
      if (px === px) sum += Math.hypot(x - px, z - pz);
      px = x; pz = z;
      if (x0 !== x0) { x0 = x; z0 = z; }
      x1 = x; z1 = z;
      // stage C6b parts: path from 30-min fixes and nest-to-nest displacement (jitter inflates 5-min paths)
      if (P.t.data[i] % every30 === 0) { if (qx === qx) sum30 += Math.hypot(x - qx, z - qz); qx = x; qz = z; }
    }
    const s = d.profile.lengthScale / 1000, n = Math.hypot(x1 - x0, z1 - z0);
    v.push(sum * s); p30.push(sum30 * s); net.push(n * s); if (sum30 > 0) straight.push(n / sum30);
  });
  if (!v.length) return none('no complete follows >= 8 h');
  const T = d.rec.truth.pathM, adults = Object.values(T);
  return { value: mean(v), n: v.length, parts: { path30Km: mean(p30), netKm: mean(net), straightness30: straight.length ? mean(straight) : null }, truth: who === 'male' && adults.length ? mean(adults) / d.days * d.profile.lengthScale / 1000 : null };
}

/** 95% fixed-kernel area (logical m²) of one community's 30-min fixes on follows that started in observation year y (reference bandwidth, as derive.ts). */
function yearKernel(d: Derived, troop: number, y: number): number {
  const P = d.rec.points, every = Math.round(30 / 60 / d.tH), xs: number[] = [], zs: number[] = [];
  d.rec.follows.forEach((f, fi) => {
    if (f.troop !== troop || obsYear(d, f.start) !== y) return;
    for (const i of d.followPts[fi]) if (P.t.data[i] % every === 0) { xs.push(P.x.data[i]); zs.push(P.z.data[i]); }
  });
  if (xs.length < 20) return 0;
  const half = d.rec.mapSize / 2, pad = 4 * d.profile.kdeCellM;
  return isoplethArea(kde(xs, zs, d.profile.kdeCellM, [-half - pad, -half - pad, half + pad, half + pad]), 0.95);
}

/** The fewest distinct 500 m cells any community used in an observation year (cell-based metrics, C6 review). */
const fewestCache = new WeakMap<Derived, number>();
function fewestCells(d: Derived): number {
  const c = fewestCache.get(d);
  if (c !== undefined) return c;
  const P = d.rec.points, every = Math.round(5 / 60 / d.tH);
  let fewest = Infinity;
  for (const troop of d.troops) for (let y = 0; y < Math.max(1, Math.floor(d.years + 1e-9)); y++) {
    const cells = new Set<string>();
    d.rec.follows.forEach((f, fi) => {
      if (f.troop !== troop || obsYear(d, f.start) !== y) return;
      for (const i of d.followPts[fi]) if (P.t.data[i] % every === 0) cells.add(cellOf(P.x.data[i], P.z.data[i], d.profile.cellM));
    });
    if (cells.size && cells.size < fewest) fewest = cells.size;
  }
  const v = Number.isFinite(fewest) ? fewest : 0;
  fewestCache.set(d, v);
  return v;
}

/** 98%-cell range (logical m²) of one community from the follows that started in observation year y. */
function yearRange(d: Derived, troop: number, y: number): number {
  const P = d.rec.points, every = Math.round(5 / 60 / d.tH), cellDays = new Map<string, number>(), seen = new Set<string>();
  d.rec.follows.forEach((f, fi) => {
    if (f.troop !== troop || obsYear(d, f.start) !== y) return;
    const day = Math.floor((f.start + 6.5) / 24);
    for (const i of d.followPts[fi]) { if (P.t.data[i] % every !== 0) continue; const k = cellOf(P.x.data[i], P.z.data[i], d.profile.cellM); if (!seen.has(`${day}|${k}`)) { seen.add(`${day}|${k}`); cellDays.set(k, (cellDays.get(k) ?? 0) + 1); } }
  });
  return cellDays.size ? cellRange(cellDays, d.profile.cellM, 0.98).area : 0;
}

function patrolMembers(d: Derived): Map<number, number> {
  const S = d.rec.scans, per = new Map<number, number>();
  for (const p of d.patrols) {
    const ids = new Set<number>();
    for (const i of d.followScans[p.follow]) { const t = H(d, S.t.data[i]); if (t < p.t0 || t > p.t1) continue; for (let k = 0; k < S.memN.data[i]; k++) ids.add(S.members.data[S.memOff.data[i] + k]); }
    for (const id of ids) per.set(id, (per.get(id) ?? 0) + 1);
  }
  return per;
}

/** Observed and inferred killings (wilson2014): seen or heard, or a carcass with a violent cause. Disappearances are at most "suspected". */
function killings(d: Derived): { victim: number; t: number }[] {
  const out: { victim: number; t: number }[] = [], seen = new Set<number>();
  for (const e of d.rec.events) if ((e.kind === 'kill' || e.kind === 'infanticide') && !seen.has(e.target)) { seen.add(e.target); out.push({ victim: e.target, t: e.t }); }
  for (const x of d.rec.deaths) if (x.violent && x.how === 'body' && !seen.has(x.id)) { seen.add(x.id); out.push({ victim: x.id, t: x.tEst }); }
  return out;
}
function suspectedKillings(d: Derived): number {
  const seen = new Set(killings(d).map(k => k.victim));
  return d.rec.deaths.filter(x => x.violent && x.how === 'disappeared' && !seen.has(x.id)).length;
}

function fruitShares(d: Derived): Map<string, [number, number]> {
  const P = d.rec.points, m = new Map<string, [number, number]>();
  for (let i = 0; i < P.t.n; i++) {
    const f = P.feed.data[i];
    if (f !== FEED_FRUIT && f !== FEED_GROUND && f !== FEED_MEAT) continue;
    const k = `${P.focal.data[i]}|${d.month(P.t.data[i])}`, v = m.get(k) ?? [0, 0];
    v[1]++; if (f === FEED_FRUIT) v[0]++; m.set(k, v);
  }
  const out = new Map<string, [number, number]>();
  for (const [k, [a, n]] of m) if (n >= 30) out.set(k, [a / n, n]);
  return out;
}

/** Calls of a kind by the focal while it was followed, keyed `${focal}|${tick of the point sample}`. */
function focalCalls(d: Derived, kind: string): Map<string, number> {
  const out = new Map<string, number>(), perMin = Math.round(1 / 60 / d.tH);
  for (const c of d.rec.calls) {
    if (c.kind !== kind) continue;
    const tick = Math.ceil(c.t / d.tH / perMin - 1e-9) * perMin;
    out.set(`${c.caller}|${tick}`, (out.get(`${c.caller}|${tick}`) ?? 0) + 1);
  }
  return out;
}

function maleCallRates(d: Derived): Map<number, number> {
  const calls = focalCalls(d, 'pant-hoot'), P = d.rec.points, n = new Map<number, [number, number]>();
  for (let i = 0; i < P.t.n; i++) {
    const id = P.focal.data[i];
    if (d.roster.get(id)?.sex !== 'male') continue;
    const v = n.get(id) ?? [0, 0]; v[0]++; v[1] += calls.get(`${id}|${P.t.data[i]}`) ?? 0; n.set(id, v);
  }
  const out = new Map<number, number>();
  for (const [id, [m, c]] of n) if (m >= MIN_SAMPLES) out.set(id, c / (m / 60));
  return out;
}

/**
 * Strong male bonds (mitani2009): for each adult male focal, the 5 m proximity index to each other adult male over
 * his 15-min scans; his strongest partner counts when its count lies above the 97.5% tail of a binomial null in which
 * a male's 5 m scans are spread evenly over the community's other males. `year` restricts to one observation year.
 */
function strongBonds(d: Derived, year = -1): { a: number; b: number; index: number }[] {
  const S = d.rec.scans, out: { a: number; b: number; index: number }[] = [];
  const scansOf = new Map<number, number[]>();
  for (let i = 0; i < S.t.n; i++) {
    if (year >= 0 && obsYear(d, H(d, S.t.data[i])) !== year) continue;
    const f = S.focal.data[i]; let l = scansOf.get(f); if (!l) scansOf.set(f, l = []); l.push(i);
  }
  for (const [a, idx] of scansOf) {
    const t = H(d, S.t.data[idx[0]]);
    if (!d.isAdultMale(a, t)) continue;
    const troop = d.roster.get(a)!.troop, males = d.adultMales(troop, t).filter(id => id !== a);
    if (!males.length || idx.length < 50) continue;
    const cnt = new Map<number, number>();
    let any = 0;
    for (const i of idx) { let hit = false; for (let k = 0; k < S.nearN.data[i]; k++) { const b = S.near.data[S.nearOff.data[i] + k]; if (males.includes(b)) { cnt.set(b, (cnt.get(b) ?? 0) + 1); hit = true; } } if (hit) any++; }
    const n = idx.length, p = any / n / males.length;
    const tail = n * p + 1.96 * Math.sqrt(n * p * (1 - p));
    let best = -1, bc = -1;
    for (const [b, c] of cnt) if (c > bc || (c === bc && b < best)) { bc = c; best = b; }
    if (best > 0 && bc > tail) out.push({ a, b: best, index: bc / n });
  }
  return out;
}

/** Mean over adult males of the longest run of consecutive years with the same strong-bond partner (mitani2009). */
function bondRuns(d: Derived): SeedValue {
  const years = Math.floor(d.years), byYear: Map<number, number>[] = [];
  for (let y = 0; y < years; y++) byYear.push(new Map(strongBonds(d, y).map(b => [b.a, b.b])));
  const males = new Set(byYear.flatMap(m => [...m.keys()])), runs: number[] = [];
  for (const a of males) {
    let best = 0, cur = 0, partner = -1;
    for (const m of byYear) { const b = m.get(a); if (b !== undefined && b === partner) cur++; else { cur = b !== undefined ? 1 : 0; partner = b ?? -1; } best = Math.max(best, cur); }
    runs.push(best);
  }
  return runs.length ? { value: mean(runs), n: runs.length, note: `over ${years} observed years (runs are censored at the run length)` } : none('no strong bonds');
}

function interbirth(d: Derived, survived: boolean): number[] {
  const byMother = new Map<number, { t: number; id: number }[]>();
  for (const b of d.rec.births) { let l = byMother.get(b.mother); if (!l) byMother.set(b.mother, l = []); l.push({ t: b.truthBirth, id: b.id }); }
  const deathT = new Map(d.rec.deaths.map(x => [x.id, x.tEst]));
  const out: number[] = [];
  for (const l of byMother.values()) {
    l.sort((a, b) => a.t - b.t);
    for (let i = 1; i < l.length; i++) { const dt = deathT.get(l[i - 1].id); const lived = dt === undefined || dt >= l[i].t; if (lived === survived) out.push((l[i].t - l[i - 1].t) / (24 * 365.25)); }
  }
  return out;
}
