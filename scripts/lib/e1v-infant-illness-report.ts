// The tables and tests of scripts/e1v-infant-illness.ts (docs/staging/e1v-infant-illness.md). Reads only the extracts
// written by that script's `all` step and each run's bench JSON (<run>/<label>.json, the scored T-DEM-1 row). Every
// number in the note is printed here; nothing is typed.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const YEAR_H = 365.25 * 24;
interface Animal {
  id: number; sex: string; troop: number; mother: number; birthH: number; deathH: number | null; cause: string | null; age: number;
  health: number; injury: number; hunger: number; slim: boolean; cond: number | null; res: number | null; outbreak: number | null; weaned: boolean | null;
  hz: number; hz0: number; yrs: number[]; expBase: number[]; inWindow: boolean; motherAlive: boolean | null; motherDeathH: number | null; motherCause: string | null; motherAge: number | null; motherCond: number | null; motherRes: number | null;
}
interface Bin { ticks: number; cond: number; condMin: number; res: number; resMin: number }
interface Inf { ticks: number; res: number; mothers: number; motherRes: number; kin: number; growth: number }
interface Extract {
  label: string; run: string; seed: number; day: number; salt: number; swallowed: number; ageRate: number; t0: number; t1: number;
  troops: { id: number; name: string }[]; P: Record<string, number>; epiInfant: number; baseInfant: number;
  animals: Animal[]; health: { day: number; troop: number; n: number }[]; arrivals: number; activeOutbreaks: number;
  transfers: number; obsDem1: { num: number; den: number; value: number | null }; viability: Record<string, any>;
  commit: string; srcTree: string; resumedFrom: string | null; obsDeaths: { id: number; tEst: number; truthTime: number; ageEst: number; founder: boolean; counted: boolean }[];
  energy: { births: number; deaths: Record<string, number>; deathsByClass: Record<string, number>; bins: Record<string, Bin>; inf: Record<string, Inf> };
}
interface Run { arm: string; label: string; run: string; seeds: number[]; ex: Extract[]; scored: { pooled: number | null; deaths: number; infantYears: number; verdict: string; distance: number | null; band: string } }

const f = (v: number | null | undefined, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? '–' : v.toFixed(d);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const mean = (a: number[]) => a.length ? sum(a) / a.length : NaN;
const sd = (a: number[]) => { const m = mean(a); return a.length > 1 ? Math.sqrt(sum(a.map(v => (v - m) ** 2)) / (a.length - 1)) : NaN; };
const table = (head: string[], rows: (string | number)[][]) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');

// ── exact distributions ──
const lgam = (n: number) => { let s = 0; for (let i = 2; i < n; i++) s += Math.log(i); return s; }; // ln Γ(n) for integers
const poisPmf = (k: number, mu: number) => mu <= 0 ? (k === 0 ? 1 : 0) : Math.exp(-mu + k * Math.log(mu) - lgam(k + 1));
const poisGe = (k: number, mu: number) => { let s = 0; for (let i = 0; i < k; i++) s += poisPmf(i, mu); return Math.max(0, 1 - s); };
const poisLe = (k: number, mu: number) => { let s = 0; for (let i = 0; i <= k; i++) s += poisPmf(i, mu); return Math.min(1, s); };
const binPmf = (k: number, n: number, p: number) => Math.exp(lgam(n + 1) - lgam(k + 1) - lgam(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p));
/** Exact binomial test, two-sided by the probability rule (outcomes no more likely than the observed one), and the upper tail. */
function binomTest(k: number, n: number, p: number): { two: number; upper: number } {
  const p0 = binPmf(k, n, p); let two = 0, upper = 0;
  for (let i = 0; i <= n; i++) { const q = binPmf(i, n, p); if (q <= p0 * (1 + 1e-9)) two += q; if (i >= k) upper += q; }
  return { two: Math.min(1, two), upper };
}
/** Garwood exact Poisson interval for a count (95%), by bisection on the mean. */
function poisInterval(k: number): [number, number] {
  const solve = (g: (mu: number) => number, lo: number, hi: number) => { for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (g(m) > 0) lo = m; else hi = m; } return (lo + hi) / 2; };
  const lo = k === 0 ? 0 : solve(mu => 0.025 - poisGe(k, mu), 0, k + 1), hi = solve(mu => poisLe(k, mu) - 0.025, k, 4 * k + 20);
  return [lo, hi];
}
/** Every way to choose k of n indices. */
function* choose(n: number, k: number, start = 0, cur: number[] = []): Generator<number[]> {
  if (cur.length === k) { yield cur.slice(); return; }
  for (let i = start; i <= n - (k - cur.length); i++) { cur.push(i); yield* choose(n, k, i + 1, cur); cur.pop(); }
}

// ── per seed-run readings ──
const firstYear = (e: Extract) => e.animals.filter(a => a.deathH !== null && a.deathH > e.t0 && a.deathH <= e.t1 && a.age < 1);
const allDeaths = (e: Extract) => e.animals.filter(a => a.deathH !== null && a.deathH > e.t0 && a.deathH <= e.t1);
const births = (e: Extract) => e.animals.filter(a => a.birthH > e.t0 && a.birthH <= e.t1);
/** Age-years lived between ages lo and hi inside the window. */
function exposure(e: Extract, lo: number, hi: number): number {
  let s = 0;
  for (const a of e.animals) {
    const from = Math.max(e.t0, a.birthH + lo * YEAR_H / e.ageRate), to = Math.min(e.t1, a.deathH ?? e.t1, a.birthH + hi * YEAR_H / e.ageRate);
    if (to > from) s += (to - from) / YEAR_H * e.ageRate;
  }
  return s;
}
const kind = (c: string | null) => !c ? 'unknown' : c === 'illness' ? 'illness' : c.startsWith('respiratory') ? 'outbreak' : c.startsWith('infanticide') ? 'infanticide' : c.startsWith('orphaned') ? 'orphan' : c === 'starvation' ? 'starvation' : 'other';
const count = (as: Animal[], k: string, lo = 0, hi = 1) => as.filter(a => kind(a.cause) === k && a.age >= lo && a.age < hi).length;
/** Calendar date of an ecological hour (hour 0 is 06:30 on 28 September; a year without a leap day). */
function dateOf(h: number): string {
  const d = new Date(Date.UTC(2001, 8, 28, 6, 30) + h * 3600e3);
  return `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`;
}
/** Census days with respiratory signs seen in the community within `d` days of the hour `h` (the observer's health monitoring). */
const illDaysNear = (e: Extract, troop: number, h: number, d = 30) => e.health.filter(x => x.troop === troop && Math.abs(((x.day - 1) * 24 + 14.5) - h) <= d * 24).length;

export function report(o: { out: string; md?: string; note?: string }): void {
  const index = JSON.parse(readFileSync(join(o.out, 'index.json'), 'utf8')) as { arm: string; label: string; run: string; seeds: number[] }[];
  const runs: Run[] = index.map(r => {
    const ex = r.seeds.map(s => JSON.parse(readFileSync(join(o.out, 'extract', `${r.label}.s${s}.json`), 'utf8')) as Extract);
    const bench = JSON.parse(readFileSync(join(r.run, `${r.label}.json`), 'utf8')) as { rows: any[] };
    const row = bench.rows.find(x => x.id === 'T-DEM-1');
    return { ...r, ex, scored: { pooled: row.pooled ?? null, deaths: row.parts?.deaths ?? NaN, infantYears: row.parts?.infantYears ?? NaN, verdict: row.verdict, distance: row.distance ?? null, band: String(row.band) } };
  });
  const arms = [...new Set(runs.map(r => r.arm))], E0 = runs[0].ex[0], P = E0.P, h0 = E0.baseInfant;
  for (const r of runs) for (const e of r.ex) {
    if (e.ageRate !== 1) throw new Error(`${e.label} s${e.seed}: ageRate ${e.ageRate}, the tables assume natural ageing`);
    if (Math.abs(e.baseInfant - h0) > 1e-12) throw new Error(`${e.label} s${e.seed}: another baseline hazard`);
    if (e.day !== E0.day || e.t0 !== E0.t0) throw new Error(`${e.label} s${e.seed}: another window`);
  }
  const swallowedOf = (arm: string) => runs.find(r => r.arm === arm)!.ex[0].swallowed;
  const L: string[] = [], J: Record<string, unknown> = {};
  const seeds = runs[0].seeds, band = runs[0].scored.band, bandEnds = band.split(/[^0-9.]+/).map(Number), bandWidth = bandEnds[1] - bandEnds[0];
  if (!(bandWidth > 0) || runs.some(r => r.scored.band !== band)) throw new Error(`T-DEM-1's band is not one range in every run: ${band}`);

  // ── 0. what was read ──
  L.push('### G0. The runs read (the part\'s commit and source-tree hash; the checkpoint each seed resumed from)', '');
  L.push(table(['arm', 'run', 'swallowed', 'rngSalt', 'commit', 'src tree', 'end checkpoint, day', 'resumed from (seed ' + seeds[0] + ')', 'T-DEM-1 band'],
    runs.map(r => [r.arm, r.label, r.ex[0].swallowed, r.ex[0].salt, [...new Set(r.ex.map(e => e.commit.slice(0, 7)))].join(' '), [...new Set(r.ex.map(e => e.srcTree.slice(0, 8)))].join(' '), [...new Set(r.ex.map(e => e.day))].join(' '), r.ex[0].resumedFrom ?? '–', r.scored.band])), '');

  // ── 1. the code's numbers ──
  L.push('### G1. The hazard the code draws from (read from the checkpoints\' parameters; `hazard()` called on a healthy uninjured infant)', '');
  L.push(table(['quantity', 'value'], [
    ['`hazardInfant` (all-cause, age < 1 y, per year)', f(P.hazardInfant, 4)],
    ['expected epidemic hazard removed from it, age < 5 y (`expectedEpidemicHazard`)', f(E0.epiInfant, 4)],
    ['baseline hazard of the slow-step draw, healthy uninjured infant (per year; ageRate 1)', f(h0, 4)],
    ['first-year mortality that baseline alone gives, 1 − exp(−h)', f(1 - Math.exp(-h0), 3)],
    ['first-year mortality with the expected epidemic share added back', f(1 - Math.exp(-(h0 + E0.epiInfant)), 3)],
    ['`hazardHealthThreshold` / `hazardHealthWeight` / `hazardInjuryWeight`', `${P.hazardHealthThreshold} / ${P.hazardHealthWeight} / ${P.hazardInjuryWeight}`],
    ['`condLow` (health falls below it; a death below it is labelled starvation) / `ledgerCondSet`', `${P.condLow} / ${P.ledgerCondSet}`],
    ['`epidemicHealthDrop` (health while ill: 1 − this, above the threshold)', f(P.epidemicHealthDrop, 2)],
    ['scored window', `days ${E0.t0 / 24}–${E0.t1 / 24} of the run (${dateOf(E0.t0)} to ${dateOf(E0.t1)}); ${seeds.length} seeds a run (${seeds.join(', ')})`],
  ]), '');

  // ── 2. per run ──
  const perRun = runs.map(r => {
    const fy = r.ex.flatMap(firstYear), ex1 = sum(r.ex.map(e => exposure(e, 0, 1))), exA = sum(r.ex.map(e => exposure(e, 0, 0.5))), exB = sum(r.ex.map(e => exposure(e, 0.5, 1)));
    const ill = count(fy, 'illness'), illA = count(fy, 'illness', 0, 0.5), illB = count(fy, 'illness', 0.5, 1);
    const obsNum = sum(r.ex.map(e => e.obsDem1.num)), obsDen = sum(r.ex.map(e => e.obsDem1.den));
    return { arm: r.arm, label: r.label, salt: r.ex[0].salt, swallowed: r.ex[0].swallowed, births: sum(r.ex.map(e => births(e).length)), ex1, exA, exB, n: fy.length, ill, illA, illB,
      outbreak: count(fy, 'outbreak'), infanticide: count(fy, 'infanticide'), orphan: count(fy, 'orphan'), starvation: count(fy, 'starvation'), other: count(fy, 'other'),
      q1: 1 - Math.exp(-fy.length / ex1), q1ill: 1 - Math.exp(-ill / ex1), scored: r.scored.pooled, scoredDeaths: r.scored.deaths, scoredYears: r.scored.infantYears, verdict: r.scored.verdict, distance: r.scored.distance,
      obsNum, obsDen, expected: h0 * ex1, arrivals: sum(r.ex.map(e => e.arrivals)), allDeaths: sum(r.ex.map(e => allDeaths(e).length)), allOutbreak: sum(r.ex.map(e => allDeaths(e).filter(a => kind(a.cause) === 'outbreak').length)),
      allStarve: sum(r.ex.map(e => allDeaths(e).filter(a => kind(a.cause) === 'starvation').length)) };
  });
  for (const p of perRun) if (Math.abs(p.obsNum - p.scoredDeaths) > 1e-9 || Math.abs(p.obsDen - p.scoredYears) > 1e-6) throw new Error(`${p.label}: the parts' T-DEM-1 pieces do not sum to the bench row`);
  J.perRun = perRun;
  L.push('### G2. First-year deaths by run (simulation truth from the end checkpoints; the scored T-DEM-1 is the bench row, an observer measure)', '');
  L.push(table(['run', 'swallowed', 'rngSalt', 'births in window', 'infant-years < 1 y', 'deaths < 1 y', 'illness < 0.5 y', 'illness 0.5–1 y', 'outbreak', 'infanticide', 'orphan', 'starvation', 'other', 'expected illness deaths at the baseline hazard', 'truth q1', 'scored T-DEM-1 (deaths / infant-years)', 'verdict, distance'],
    perRun.map(p => [p.label, p.swallowed, p.salt, p.births, f(p.ex1, 2), p.n, p.illA, p.illB, p.outbreak, p.infanticide, p.orphan, p.starvation, p.other, f(p.expected, 2), f(p.q1, 2), `${f(p.scored, 2)} (${p.scoredDeaths} / ${f(p.scoredYears, 1)})`, `${p.verdict}, ${f(p.distance, 2)}`])), '');
  const byArm = arms.map(arm => {
    const ps = perRun.filter(p => p.arm === arm), d = sum(ps.map(p => p.n)), ill = sum(ps.map(p => p.ill)), ex = sum(ps.map(p => p.ex1)), sc = sum(ps.map(p => p.scoredDeaths)), sy = sum(ps.map(p => p.scoredYears));
    const [lo, hi] = poisInterval(sc), [ilo, ihi] = poisInterval(ill);
    return { arm, swallowed: swallowedOf(arm), runs: ps.length, births: sum(ps.map(p => p.births)), ex, d, ill, outbreak: sum(ps.map(p => p.outbreak)), infanticide: sum(ps.map(p => p.infanticide)), orphan: sum(ps.map(p => p.orphan)), starvation: sum(ps.map(p => p.starvation)),
      expected: h0 * ex, illRate: ill / ex, illLo: ilo / ex, illHi: ihi / ex, scoredPooled: 1 - Math.exp(-sc / sy), scoredLo: 1 - Math.exp(-lo / sy), scoredHi: 1 - Math.exp(-hi / sy), sc, sy,
      meanScored: mean(ps.map(p => p.scored ?? NaN)), sdScored: sd(ps.map(p => p.scored ?? NaN)), allStarve: sum(ps.map(p => p.allStarve)), arrivals: sum(ps.map(p => p.arrivals)), allOutbreak: sum(ps.map(p => p.allOutbreak)) };
  });
  J.byArm = byArm;
  L.push('### G3. The arms pooled over their four runs (20 seed-runs each)', '');
  L.push(table(['arm', 'swallowed', 'births', 'infant-years < 1 y', 'deaths < 1 y', 'illness', 'outbreak', 'infanticide', 'orphan', 'starvation', 'expected illness deaths at the baseline hazard', 'illness deaths per infant-year (95% Poisson interval)', 'scored T-DEM-1, four runs pooled (95% interval)', 'scored T-DEM-1, mean ± SD of the four runs', 'epidemic arrivals, whole run', 'outbreak deaths, all ages', 'starvation deaths, all ages'],
    byArm.map(a => [a.arm, a.swallowed, a.births, f(a.ex, 1), a.d, a.ill, a.outbreak, a.infanticide, a.orphan, a.starvation, f(a.expected, 1), `${f(a.illRate, 3)} (${f(a.illLo, 3)}–${f(a.illHi, 3)})`, `${f(a.scoredPooled, 2)} (${f(a.scoredLo, 2)}–${f(a.scoredHi, 2)}); ${a.sc} / ${f(a.sy, 1)}`, `${f(a.meanScored, 2)} ± ${f(a.sdScored, 2)}`, a.arrivals, a.allOutbreak, a.allStarve])), '');

  // where the observer's count differs from truth: T-DEM-1's life table uses the observer's estimated ages and death times
  // (a founder's age is an estimate, src/field/observer.ts:148-149; a death is dated between the last sighting and the census)
  const rowsS: (string | number)[][] = [];
  for (const r of runs) for (const e of r.ex) {
    const fy = firstYear(e), scoredIds = new Set(e.obsDeaths.filter(d => d.counted).map(d => d.id)), truthIds = new Set(fy.map(a => a.id)), byId = new Map(e.animals.map(a => [a.id, a]));
    const show = (id: number) => { const a = byId.get(id), d = e.obsDeaths.find(x => x.id === id); return `${id}: true age ${a ? f(a.age, 2) : '?'} y${d ? `, estimated ${f(d.ageEst, 2)} y${d.founder ? ' (founder)' : ''}` : ', not in the death records'}, ${a ? (kind(a.cause) === 'infanticide' ? 'infanticide' : a.cause) : '?'}, day ${a && a.deathH !== null ? f(a.deathH / 24, 0) : '?'}`; };
    const extra = [...scoredIds].filter(id => !truthIds.has(id)), missed = [...truthIds].filter(id => !scoredIds.has(id));
    if (extra.length || missed.length) rowsS.push([r.label, e.seed, scoredIds.size, truthIds.size, extra.map(show).join('; ') || '–', missed.map(show).join('; ') || '–']);
  }
  J.scoredVsTruth = rowsS;
  L.push('### G3b. Seed-runs where the scored first-year deaths differ from simulation truth (T-DEM-1 reads the observer\'s estimated ages and death times)', '');
  L.push(table(['run', 'seed', 'scored first-year deaths', 'truth', 'scored, not a first-year death in truth', 'first-year death in truth, not scored'], rowsS), '');

  // ── 3. by seed ──
  L.push('### G4. Illness deaths under one year by seed-run (each cell: illness deaths < 1 y; in brackets the other first-year deaths: o outbreak, k infanticide, m orphan, s starvation)', '');
  const cell = (e: Extract) => { const fy = firstYear(e), x = [['o', count(fy, 'outbreak')], ['k', count(fy, 'infanticide')], ['m', count(fy, 'orphan')], ['s', count(fy, 'starvation')], ['x', count(fy, 'other')]].filter(v => v[1]).map(v => `${v[1]}${v[0]}`).join(' '); return `${count(fy, 'illness')}${x ? ` [${x}]` : ''}`; };
  L.push(table(['run', ...seeds.map(s => `seed ${s}`), 'run total'], runs.map(r => [r.label, ...r.ex.map(cell), sum(r.ex.map(e => count(firstYear(e), 'illness')))])), '');
  const seedTot = seeds.map((s, i) => ({ seed: s, ill: sum(runs.map(r => count(firstYear(r.ex[i]), 'illness'))), ex: sum(runs.map(r => exposure(r.ex[i], 0, 1))) }));
  const saltTot = [...new Set(perRun.map(p => p.salt))].sort().map(k => ({ salt: k, byArm: arms.map(a => perRun.find(p => p.arm === a && p.salt === k)?.ill ?? NaN), scored: arms.map(a => perRun.find(p => p.arm === a && p.salt === k)?.scored ?? NaN) }));
  J.seedTot = seedTot; J.saltTot = saltTot;
  L.push(table(['', ...seeds.map(s => `seed ${s}`)], [['illness deaths < 1 y over the 12 runs', ...seedTot.map(s => s.ill)], ['infant-years < 1 y over the 12 runs', ...seedTot.map(s => f(s.ex, 1))], ['expected at the baseline hazard', ...seedTot.map(s => f(h0 * s.ex, 1))]]), '');
  L.push(table(['rngSalt', ...arms.map(a => `${a}: illness deaths < 1 y`), ...arms.map(a => `${a}: scored T-DEM-1`)], saltTot.map(s => [s.salt, ...s.byArm, ...s.scored.map(v => f(v, 2))])), '');

  // ── 4. every first-year death ──
  const rowsD: (string | number)[][] = [], deaths: Record<string, unknown>[] = [];
  let illN = 0, illAtBase = 0, illAllAges = 0, illAllAtBase = 0, minHealthIll = Infinity, maxInjuryIll = 0, motherDeadIll = 0, nearOutbreakIll = 0;
  for (const r of runs) for (const e of r.ex) {
    for (const a of allDeaths(e)) if (kind(a.cause) === 'illness') { illAllAges++; if (Math.abs(a.hz / a.hz0 - 1) < 1e-9) illAllAtBase++; }
    for (const a of firstYear(e).sort((x, y) => x.deathH! - y.deathH!)) {
      const mult = a.hz / a.hz0, troop = e.troops.find(t => t.id === a.troop)?.name.replace(' community', '') ?? String(a.troop), near = illDaysNear(e, a.troop, a.deathH!);
      const motherAliveThen = a.motherDeathH === null || a.motherDeathH > a.deathH!;
      if (kind(a.cause) === 'illness') { illN++; if (Math.abs(mult - 1) < 1e-9) illAtBase++; minHealthIll = Math.min(minHealthIll, a.health); maxInjuryIll = Math.max(maxInjuryIll, a.injury); if (!motherAliveThen) motherDeadIll++; if (near) nearOutbreakIll++; }
      deaths.push({ run: r.label, arm: r.arm, seed: e.seed, id: a.id, mother: a.mother, troop, ageDays: a.age * 365.25, day: a.deathH! / 24, cause: a.cause, health: a.health, injury: a.injury, mult, motherAliveThen, near });
      rowsD.push([r.label, e.seed, a.id, a.mother, troop, f(a.age * 365.25, 0), f(a.deathH! / 24, 0), dateOf(a.deathH!), kind(a.cause) === 'infanticide' ? 'infanticide' : a.cause ?? '', f(a.health, 2), f(a.injury, 2), f(mult, 2), motherAliveThen ? 'yes' : 'no', near]);
    }
  }
  J.deaths = deaths; J.illness = { firstYear: illN, firstYearAtBaseline: illAtBase, allAges: illAllAges, allAgesAtBaseline: illAllAtBase, minHealth: minHealthIll, maxInjury: maxInjuryIll, motherDead: motherDeadIll, nearOutbreak: nearOutbreakIll };
  L.push('### G5. Every first-year death of the twelve runs (health and injury as the death left them; multiplier = hazard at that state ÷ baseline hazard)', '');
  L.push(table(['run', 'seed', 'infant', 'mother', 'community', 'age, days', 'day of run', 'date', 'cause', 'health', 'injury', 'hazard multiplier', 'mother alive', 'census days with respiratory signs in the community within 30 d'], rowsD), '');
  L.push(`Of the ${illN} first-year deaths labelled illness, ${illAtBase} were drawn at exactly the baseline hazard (multiplier 1.00): lowest health at death ${f(minHealthIll, 2)}, highest injury ${f(maxInjuryIll, 2)}, ${motherDeadIll} with the mother dead, ${nearOutbreakIll} with respiratory signs seen in the community within 30 days. Over all ages, ${illAllAtBase} of the ${illAllAges} illness deaths of the twelve runs were drawn at their age class's baseline hazard.`, '');

  // mothers repeated across realizations (the initial world of a seed is the same in all 12 runs)
  const fate = new Map<string, { runs: number; ill: number; any: number }>();
  for (const r of runs) for (const e of r.ex) for (const a of births(e)) {
    const k = `${e.seed}:${a.mother}`, v = fate.get(k) ?? { runs: 0, ill: 0, any: 0 };
    v.runs++; if (a.deathH !== null && a.age < 1) { v.any++; if (kind(a.cause) === 'illness') v.ill++; }
    fate.set(k, v);
  }
  const high = perRun.filter(p => p.arm === 'W50').sort((a, b) => (b.scored ?? 0) - (a.scored ?? 0)).slice(0, 2).map(p => p.label);
  const rowsM: (string | number)[][] = [];
  for (const d of deaths) if (high.includes(d.run as string) && d.cause === 'illness') { const v = fate.get(`${d.seed}:${d.mother}`); if (v) rowsM.push([d.run as string, d.seed as number, d.mother as number, v.runs, v.ill, v.any]); }
  const repeatHist = [0, 1, 2, 3, 4].map(k => [...fate.values()].filter(v => v.ill === k).length);
  J.high = high; J.motherFates = rowsM; J.repeatHist = repeatHist; J.mothers = fate.size;
  L.push(`### G6. The same mothers in the other realizations (a seed's initial world is identical in all twelve runs; rows: the illness deaths under one year of ${high.join(' and ')})`, '');
  L.push(table(['run', 'seed', 'mother', 'runs of the 12 in which she gave birth in the window', 'of those births, died of illness < 1 y', 'died < 1 y of any cause'], rowsM), '');
  L.push(`Mothers (seed × mother) with a birth in the window in at least one run: ${fate.size}; with 0, 1, 2, 3, 4 illness deaths of those infants over the runs: ${repeatHist.join(', ')}.`, '');

  // ── 5. energy state ──
  const binRow = (r: Run, b: string) => { const xs = r.ex.map(e => e.energy.bins[b]).filter(x => x && x.ticks > 0), t = sum(xs.map(x => x.ticks)); return { min: Math.min(...xs.map(x => x.condMin)), cond: sum(xs.map(x => x.cond)) / t, res: sum(xs.map(x => x.res)) / t, resMin: Math.min(...xs.map(x => x.resMin)) }; };
  const infRow = (r: Run, b: string) => { const xs = r.ex.map(e => e.energy.inf[b]).filter(x => x && x.ticks > 0), t = sum(xs.map(x => x.ticks)), m = sum(xs.map(x => x.mothers)); return { mother: sum(xs.map(x => x.motherRes)) / m, milk: sum(xs.map(x => x.kin)) / t * 5760, days: t / 5760 }; };
  const A = '0–0.5 y', B = '0.5–1 y';
  const eRows = runs.map(r => { const a = binRow(r, A), b = binRow(r, B), ia = infRow(r, A), ib = infRow(r, B); return { label: r.label, a, b, ia, ib }; });
  J.energy = eRows;
  L.push('### G7. Energy state of infants under one year and of their mothers, by run (energy readout of the parts: every tick of every animal of the age class; condition = ledgerCondSet × (1 + reserves ÷ store))', '');
  L.push(table(['run', 'illness deaths < 1 y', '0–0.5 y: lowest condition of any infant at any tick', '0–0.5 y: mean condition', '0–0.5 y: mean reserves ÷ store', '0–0.5 y: milk kcal per infant-day', 'their mothers: mean reserves ÷ store', '0.5–1 y: lowest condition', '0.5–1 y: mean condition', '0.5–1 y: mean reserves ÷ store', 'their mothers: mean reserves ÷ store'],
    eRows.map((x, i) => [x.label, perRun[i].ill, f(x.a.min, 3), f(x.a.cond, 3), f(x.a.res, 3), f(x.ia.milk, 0), f(x.ia.mother, 3), f(x.b.min, 3), f(x.b.cond, 3), f(x.b.res, 3), f(x.ib.mother, 3)])), '');
  const eArm = arms.map(arm => {
    const rs = runs.filter(r => r.arm === arm), bins = (b: string) => rs.flatMap(r => r.ex.map(e => e.energy.bins[b])).filter(x => x && x.ticks > 0), infs = (b: string) => rs.flatMap(r => r.ex.map(e => e.energy.inf[b])).filter(x => x && x.ticks > 0);
    const a = bins(A), b = bins(B), ia = infs(A), ib = infs(B), t = (xs: { ticks: number }[]) => sum(xs.map(x => x.ticks));
    return { arm, condA: sum(a.map(x => x.cond)) / t(a), condB: sum(b.map(x => x.cond)) / t(b), minA: Math.min(...a.map(x => x.condMin)), minB: Math.min(...b.map(x => x.condMin)), belowA: a.filter(x => x.condMin < P.condLow).length, belowB: b.filter(x => x.condMin < P.condLow).length,
      motherA: sum(ia.map(x => x.motherRes)) / sum(ia.map(x => x.mothers)), motherB: sum(ib.map(x => x.motherRes)) / sum(ib.map(x => x.mothers)), milkA: sum(ia.map(x => x.kin)) / t(ia) * 5760 };
  });
  J.energyByArm = eArm;
  L.push(table(['arm', 'illness deaths < 1 y', '0–0.5 y: mean condition', '0–0.5 y: lowest condition', 'seed-runs (of 20) with an infant 0–0.5 y ever below condLow', '0–0.5 y: milk kcal per infant-day', 'mothers of 0–0.5 y: mean reserves ÷ store', '0.5–1 y: mean condition', '0.5–1 y: lowest condition', 'seed-runs with an infant 0.5–1 y ever below condLow', 'mothers of 0.5–1 y: mean reserves ÷ store'],
    eArm.map(x => [x.arm, byArm.find(a => a.arm === x.arm)!.ill, f(x.condA, 3), f(x.minA, 3), x.belowA, f(x.milkA, 0), f(x.motherA, 3), f(x.condB, 3), f(x.minB, 3), x.belowB, f(x.motherB, 3)])), '');
  let below = 0, cells = 0, lowest = Infinity;
  for (const r of runs) for (const e of r.ex) for (const b of [A, B]) { const x = e.energy.bins[b]; if (!x || !x.ticks) continue; cells++; lowest = Math.min(lowest, x.condMin); if (x.condMin < P.condLow) below++; }
  // seed-runs with and without an illness death under six months
  const split = { with: [] as number[], without: [] as number[], mWith: [] as number[], mWithout: [] as number[] };
  for (const r of runs) for (const e of r.ex) { const x = e.energy.bins[A], i = e.energy.inf[A]; if (!x || !x.ticks) continue; const hit = count(firstYear(e), 'illness', 0, 0.5) > 0; (hit ? split.with : split.without).push(x.cond / x.ticks); (hit ? split.mWith : split.mWithout).push(i.motherRes / i.mothers); }
  J.energySummary = { cells, below, lowest, split: { nWith: split.with.length, nWithout: split.without.length, condWith: mean(split.with), condWithout: mean(split.without), motherWith: mean(split.mWith), motherWithout: mean(split.mWithout) } };
  L.push(`Seed-run × age-class cells under one year with any infant-ticks: ${cells}; cells in which any infant's condition was ever below condLow (${P.condLow}): ${below}; the lowest condition of any infant under one year at any tick of the twelve runs: ${f(lowest, 3)}.`, '');
  L.push(`Seed-runs with an illness death under six months (${split.with.length}) against those without (${split.without.length}): mean condition of infants 0–0.5 y ${f(mean(split.with), 3)} against ${f(mean(split.without), 3)}; their mothers' mean reserves ÷ store ${f(mean(split.mWith), 3)} against ${f(mean(split.mWithout), 3)}.`, '');

  // ── 6. the tests ──
  L.push('### G8. Tests', '');
  const T: Record<string, unknown> = {};
  // (a) calibration: illness deaths against the code's baseline hazard
  const totIll = sum(perRun.map(p => p.ill)), totEx = sum(perRun.map(p => p.ex1)), mu = h0 * totEx;
  T.calibration = { ill: totIll, infantYears: totEx, expected: mu, pUpper: poisGe(totIll, mu), pLower: poisLe(totIll, mu) };
  L.push(`**T1. Calibration (all twelve runs).** Illness deaths under one year: ${totIll} in ${f(totEx, 1)} infant-years; the code's baseline hazard gives ${f(mu, 1)} expected. Poisson P(X ≥ ${totIll}) = ${f(poisGe(totIll, mu), 3)}, P(X ≤ ${totIll}) = ${f(poisLe(totIll, mu), 3)}.`, '');
  // (a2) the same calibration by age class: deaths the slow-step draw labels illness or old age against the integrated baseline hazard
  const CLS = ['< 1 y', '1–5 y', '5–15 y', '15 y or more'], clsOf = (a: number) => a < 1 ? 0 : a < 5 ? 1 : a < 15 ? 2 : 3;
  const cal = CLS.map((name, k) => {
    let d = 0, atBase = 0, yrs = 0, exp = 0; const perArm = arms.map(() => ({ d: 0, exp: 0 }));
    runs.forEach(r => { const ai = arms.indexOf(r.arm); for (const e of r.ex) for (const a of e.animals) {
      yrs += a.yrs[k]; exp += a.expBase[k]; perArm[ai].exp += a.expBase[k];
      if (a.deathH !== null && a.deathH > e.t0 && (a.cause === 'illness' || a.cause === 'old age') && clsOf(a.age) === k) { d++; perArm[ai].d++; if (Math.abs(a.hz / a.hz0 - 1) < 1e-9) atBase++; }
    } });
    return { name, yrs, d, atBase, exp, pUpper: poisGe(d, exp), pLower: poisLe(d, exp), perArm };
  });
  const older = { d: sum(cal.slice(1).map(c => c.d)), exp: sum(cal.slice(1).map(c => c.exp)) }, every = { d: sum(cal.map(c => c.d)), exp: sum(cal.map(c => c.exp)) };
  T.calibrationByAge = { classes: cal, older: { ...older, pUpper: poisGe(older.d, older.exp) }, all: { ...every, pUpper: poisGe(every.d, every.exp) } };
  L.push('**T1b. The same calibration by age class** (deaths the slow-step draw labels illness or old age, by age at death, against the baseline hazard of each animal integrated over its time in the window; wounds and low health multiply the baseline, so the expectation is a floor above one year).', '');
  L.push(table(['age class', 'animal-years in the window', 'illness or old-age deaths', 'of them at multiplier 1.00', 'expected at the baseline hazard', 'observed ÷ expected', 'Poisson P(X ≥ observed)', 'P(X ≤ observed)', ...arms.map(a => `${a}: observed / expected`)],
    [...cal.map(c => [c.name, f(c.yrs, 1), c.d, c.atBase, f(c.exp, 1), f(c.d / c.exp, 2), f(c.pUpper, 3), f(c.pLower, 3), ...c.perArm.map(x => `${x.d} / ${f(x.exp, 1)}`)]),
      ['1 y or more', '', older.d, '', f(older.exp, 1), f(older.d / older.exp, 2), f(poisGe(older.d, older.exp), 3), f(poisLe(older.d, older.exp), 3), ...arms.map(() => '')],
      ['all ages', '', every.d, '', f(every.exp, 1), f(every.d / every.exp, 2), f(poisGe(every.d, every.exp), 3), f(poisLe(every.d, every.exp), 3), ...arms.map(() => '')]]), '');
  const exA = sum(perRun.map(p => p.exA)), exB = sum(perRun.map(p => p.exB)), illA = sum(perRun.map(p => p.illA)), illB = sum(perRun.map(p => p.illB));
  T.halves = { exA, exB, illA, illB, pA: poisGe(illA, h0 * exA), pB: poisGe(illB, h0 * exB) };
  L.push(`Under six months: ${illA} illness deaths in ${f(exA, 1)} infant-years (${f(h0 * exA, 1)} expected, P(X ≥ ${illA}) = ${f(poisGe(illA, h0 * exA), 3)}); six to twelve months: ${illB} in ${f(exB, 1)} (${f(h0 * exB, 1)} expected, P(X ≥ ${illB}) = ${f(poisGe(illB, h0 * exB), 3)}). The hazard is one constant for the whole first year (life.ts:202), so the deaths fall under six months because that is where the infant-years of a 12-month window are.`, '');
  // (b) arm against the rest, the infant as the unit (valid for baseline draws: independent, one constant hazard)
  const armRows = arms.map(arm => { const a = byArm.find(x => x.arm === arm)!, restIll = totIll - a.ill, restEx = totEx - a.ex, t = binomTest(a.ill, totIll, a.ex / totEx); return { arm, ill: a.ill, ex: a.ex, restIll, restEx, ratio: (a.ill / a.ex) / (restIll / restEx), two: t.two, upper: t.upper, pBase: poisGe(a.ill, h0 * a.ex) }; });
  T.armVsRest = armRows;
  L.push('**T2. One arm against the other two, illness deaths under one year, exact conditional test** (given the total, an arm\'s count is binomial with its share of the infant-years; the infant-draw is the unit, which the code supports for these deaths: G5).', '');
  L.push(table(['arm', 'illness deaths / infant-years', 'the other two arms', 'rate ratio', 'exact p, two-sided', 'exact p, upper tail', 'Poisson P(X ≥ count) at the baseline hazard'], armRows.map(a => [a.arm, `${a.ill} / ${f(a.ex, 1)}`, `${a.restIll} / ${f(a.restEx, 1)}`, f(a.ratio, 2), f(a.two, 3), f(a.upper, 3), f(a.pBase, 3)])), '');
  // (c) the run as the unit: exact permutation of the arm labels over the 12 runs
  const perm = (vals: number[], labels: string[], target: string) => {
    const idx = labels.map((l, i) => l === target ? i : -1).filter(i => i >= 0), k = idx.length, n = vals.length, tot = sum(vals);
    const stat = (ids: number[]) => { const s = sum(ids.map(i => vals[i])); return s / k - (tot - s) / (n - k); };
    const obs = stat(idx); let ge = 0, abs = 0, N = 0;
    for (const c of choose(n, k)) { const s = stat(c); N++; if (s >= obs - 1e-12) ge++; if (Math.abs(s) >= Math.abs(obs) - 1e-12) abs++; }
    return { obs, upper: ge / N, two: abs / N, N };
  };
  const labels = perRun.map(p => p.arm), scored = perRun.map(p => p.scored ?? NaN), truth = perRun.map(p => p.q1), illq = perRun.map(p => p.q1ill);
  const permRows = arms.flatMap(arm => [['scored T-DEM-1', scored], ['truth q1, all causes', truth], ['truth q1, illness only', illq]].map(([name, v]) => ({ arm, name: name as string, ...perm(v as number[], labels, arm) })));
  T.permutation = permRows;
  L.push('**T3. The run as the unit: exact permutation test over the twelve runs** (statistic: mean of the arm\'s four runs − mean of the other eight; all 495 ways to pick four runs).', '');
  L.push(table(['arm', 'measure', 'mean difference', 'p, upper tail', 'p, two-sided'], permRows.map(r => [r.arm, r.name, f(r.obs, 3), f(r.upper, 3), f(r.two, 3)])), '');
  // three-arm permutation (between-arm sum of squares), all 34,650 partitions into three labelled groups of four
  const three = (vals: number[]) => {
    const n = vals.length, g = n / 3, m = mean(vals), ss = (a: number[], b: number[], c: number[]) => [a, b, c].reduce((s, x) => s + g * (mean(x.map(i => vals[i])) - m) ** 2, 0);
    const groupsOf = arms.map(arm => labels.map((l, i) => l === arm ? i : -1).filter(i => i >= 0)), obs = ss(groupsOf[0], groupsOf[1], groupsOf[2]);
    let ge = 0, N = 0; const allIdx = vals.map((_, i) => i);
    for (const a of choose(n, g)) { const rest = allIdx.filter(i => !a.includes(i)); for (const bi of choose(rest.length, g)) { const b = bi.map(i => rest[i]), c = rest.filter(i => !b.includes(i)); N++; if (ss(a, b, c) >= obs - 1e-12) ge++; } }
    return { obs, p: ge / N, N };
  };
  const t3 = { scored: three(scored), truth: three(truth), ill: three(illq) };
  T.threeArm = t3;
  L.push(`Three arms at once (between-arm sum of squares, all ${t3.scored.N} assignments of the twelve runs to three groups of four): scored T-DEM-1 p = ${f(t3.scored.p, 3)}; truth q1, all causes p = ${f(t3.truth.p, 3)}; truth q1, illness only p = ${f(t3.ill.p, 3)}.`, '');
  // (d) the spread of the twelve runs against Poisson noise at the code's hazard
  const order = [...perRun].sort((a, b) => b.ill - a.ill), kth = order[1].ill;
  const pi = perRun.map(p => poisGe(kth, p.expected));
  const p0 = pi.reduce((s, p) => s * (1 - p), 1), p1 = sum(pi.map((p, i) => p * pi.reduce((s, q, j) => j === i ? s : s * (1 - q), 1)));
  const disp = sum(perRun.map(p => (p.ill - p.expected) ** 2 / p.expected)), top = order[0].ill, pTop = 1 - perRun.reduce((s, p) => s * (1 - poisGe(top, p.expected)), 1);
  // exact-enough reference for the dispersion statistic: a fixed-seed draw of the 12 Poisson counts (xorshift32, seed 20261006)
  let rng = 20261006 >>> 0; const rnd = () => { rng ^= rng << 13; rng >>>= 0; rng ^= rng >>> 17; rng ^= rng << 5; rng >>>= 0; return rng / 4294967296; };
  const draw = (m: number) => { const l = Math.exp(-m); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > l); return k - 1; };
  const NSIM = 200000; let geDisp = 0, twoHigh = 0;
  for (let s = 0; s < NSIM; s++) { let d = 0, hi = 0; for (const p of perRun) { const x = draw(p.expected); d += (x - p.expected) ** 2 / p.expected; if (x >= kth) hi++; } if (d >= disp) geDisp++; if (hi >= 2) twoHigh++; }
  // homogeneity of the twelve runs given their total (multinomial on the infant-years): the level is taken from the data
  const shareEx = perRun.map(p => p.ex1 / totEx), muHat = shareEx.map(s => s * totIll), dispHat = sum(perRun.map((p, i) => (p.ill - muHat[i]) ** 2 / muHat[i])), maxIll = Math.max(...perRun.map(p => p.ill));
  const cum = shareEx.map((_, i) => sum(shareEx.slice(0, i + 1))); let geHat = 0, geMax = 0;
  for (let s = 0; s < NSIM; s++) { const c = perRun.map(() => 0); for (let k = 0; k < totIll; k++) { const u = rnd(); let i = 0; while (i < cum.length - 1 && u > cum[i]) i++; c[i]++; } const d = sum(c.map((x, i) => (x - muHat[i]) ** 2 / muHat[i])); if (d >= dispHat - 1e-12) geHat++; if (Math.max(...c) >= maxIll) geMax++; }
  T.homogeneity = { dispersion: dispHat, df: perRun.length - 1, p: geHat / NSIM, maxRun: maxIll, pMax: geMax / NSIM, nsim: NSIM };
  const sdQ = sd(scored), sdTruth = sd(truth), muRun = mean(perRun.map(p => p.expected)), exRun = mean(perRun.map(p => p.ex1));
  const sdPois = Math.sqrt(mean(perRun.map(p => { const m = (h0 + E0.epiInfant) * p.ex1; let v = 0, mq = 0; for (let k = 0; k < 60; k++) { const q = 1 - Math.exp(-k / p.ex1), w = poisPmf(k, m); mq += w * q; v += w * q * q; } return v - mq * mq; })));
  T.spread = { highest: top, pHighestOneRun: poisGe(top, order[0].expected), pHighestAnyRun: pTop, secondHighest: kth, pAtLeastTwo: 1 - p0 - p1, pAtLeastTwoSim: twoHigh / NSIM, dispersion: disp, df: perRun.length, pDispersion: geDisp / NSIM, nsim: NSIM, sdScored: sdQ, sdTruth, sdPoisson: sdPois, meanExpected: muRun, meanInfantYears: exRun, range: [Math.min(...scored), Math.max(...scored)] };
  L.push(`**T4. The spread of the twelve runs against Poisson noise at the code's hazard.** Expected illness deaths under one year per run: ${f(muRun, 2)} (${f(exRun, 1)} infant-years × ${f(h0, 4)}). The second-highest run has ${kth}; the probability that at least two of twelve independent runs reach ${kth} or more, each Poisson at its own expectation: ${f(1 - p0 - p1, 3)} (exact). The highest run (${order[0].label}) has ${top} against ${f(order[0].expected, 2)} expected: Poisson P(X ≥ ${top}) = ${f(poisGe(top, order[0].expected), 4)} for that run, ${f(pTop, 3)} that some run of the twelve reaches it. Dispersion Σ(observed − expected)² ÷ expected over the twelve runs: ${f(disp, 1)} (Poisson noise gives about ${perRun.length}); the share of ${NSIM} fixed-seed Poisson draws of the twelve runs with a dispersion at least as large: ${f(geDisp / NSIM, 3)}.`, '');
  L.push(`**T4b. Are the twelve runs alike, whatever the level?** Given the ${totIll} illness deaths and each run's share of the infant-years (multinomial), the dispersion is ${f(dispHat, 1)} on ${perRun.length - 1} degrees of freedom; the share of ${NSIM} fixed-seed multinomial draws at least as dispersed: ${f(geHat / NSIM, 3)}; the share in which some run has ${maxIll} or more: ${f(geMax / NSIM, 3)}.`, '');
  L.push(`Scored T-DEM-1 over the twelve runs: ${f(Math.min(...scored), 2)} to ${f(Math.max(...scored), 2)}, mean ${f(mean(scored), 2)}, SD ${f(sdQ, 3)} (truth q1: mean ${f(mean(truth), 2)}, SD ${f(sdTruth, 3)}). The SD that Poisson noise alone gives a run's q1 at these infant-years and the all-cause hazard (${f(h0 + E0.epiInfant, 4)}): ${f(sdPois, 3)}. The band ${band} is ${f(bandWidth / sdPois, 2)} of that SD wide; one death moves a run's q1 by about ${f((1 - Math.exp(-3 / exRun)) - (1 - Math.exp(-2 / exRun)), 3)}.`, '');
  // (e) the two highest of twelve in one arm
  L.push(`**T5. Where the two highest runs fall.** The two highest scored values are ${high.join(' and ')}. The chance that the two highest of twelve exchangeable runs fall in the same arm is 3/11 = ${f(3 / 11, 3)}; in one named arm 1/11 = ${f(1 / 11, 3)}.`, '');
  // dose order
  const dose = [...byArm].sort((a, b) => b.swallowed - a.swallowed);
  T.dose = dose.map(a => ({ arm: a.arm, swallowed: a.swallowed, illRate: a.illRate, scoredPooled: a.scoredPooled }));
  L.push(`**T6. Order along the input.** Illness deaths per infant-year at swallowed ${dose.map(a => a.swallowed).join(', ')}: ${dose.map(a => f(a.illRate, 3)).join(', ')} (baseline hazard ${f(h0, 3)}); scored T-DEM-1 pooled: ${dose.map(a => f(a.scoredPooled, 2)).join(', ')}.`, '');
  // (g) what further saved runs would show: new infant-years needed to tell the baseline from the 0.5 arm's observed rate
  const w50 = byArm.find(a => a.arm === 'W50')!, perRunYear = totEx / perRun.length;
  const plan = [2, 4, 8].map(runYears => { const ex = runYears * perRunYear, m0 = h0 * ex, m1 = w50.illRate * ex; let k = 0; while (poisGe(k, m0) > 0.05) k++; return { runYears, ex, m0, m1, k, alpha: poisGe(k, m0), power: poisGe(k, m1) }; });
  T.plan = plan;
  L.push(`**T7. What new draws at 0.5 would show.** A run-year (5 seeds) holds ${f(perRunYear, 1)} infant-years under one. Illness deaths under one year expected at the baseline hazard, the smallest count that the baseline gives with probability 0.05 or less, and the chance of reaching it if the true rate were the 0.5 arm's observed ${f(w50.illRate, 3)} per infant-year:`, '');
  L.push(table(['new run-years at 0.5', 'infant-years', 'expected at baseline', 'expected at the observed rate', 'count that rejects the baseline', 'its probability at baseline', 'power at the observed rate'], plan.map(x => [x.runYears, f(x.ex, 1), f(x.m0, 1), f(x.m1, 1), x.k, f(x.alpha, 3), f(x.power, 2)])), '');
  J.tests = T;

  // ── key numbers (the note's answer section quotes these lines) ──
  const K: string[] = [], hi = perRun.filter(p => high.includes(p.label)), hiDeaths = deaths.filter(d => high.includes(d.run as string)), hiIll = hiDeaths.filter(d => d.cause === 'illness');
  const armOf = (a: string) => byArm.find(x => x.arm === a)!, eOf = (a: string) => eArm.find(x => x.arm === a)!, tOf = (a: string) => armRows.find(x => x.arm === a)!, pOf = (a: string, n: string) => permRows.find(x => x.arm === a && x.name === n)!;
  K.push(`- **K1. The row.** Scored T-DEM-1 of the four runs (rngSalt 0–3): ${arms.map(a => `${a} ${perRun.filter(p => p.arm === a).map(p => f(p.scored, 2)).join(', ')}`).join('; ')}. Over the twelve runs: ${f(Math.min(...scored), 2)} to ${f(Math.max(...scored), 2)}, mean ${f(mean(scored), 2)}, SD ${f(sdQ, 3)}; band ${band}. Scored first-year deaths ÷ infant-years: ${arms.map(a => `${a} ${armOf(a).sc} / ${f(armOf(a).sy, 1)}`).join('; ')}.`);
  K.push(`- **K2. The deaths of the two high runs (${high.join(', ')}).** Simulation truth: ${hi.map(p => `${p.label} ${p.n} first-year deaths (${p.ill} illness: ${p.illA} under six months, ${p.illB} at six to twelve; ${p.outbreak} outbreak, ${p.infanticide} infanticide, ${p.orphan} orphan, ${p.starvation} starvation)`).join('; ')}. Of the ${hiIll.length} illness deaths, ${hiIll.filter(d => Math.abs((d.mult as number) - 1) < 1e-9).length} were drawn at hazard multiplier 1.00 (health at death ${f(Math.min(...hiIll.map(d => d.health as number)), 2)} to ${f(Math.max(...hiIll.map(d => d.health as number)), 2)}, injury ${f(Math.max(...hiIll.map(d => d.injury as number)), 2)} at most), ${hiIll.filter(d => d.motherAliveThen).length} with the mother alive, ${hiIll.filter(d => (d.near as number) > 0).length} with respiratory signs seen in the community within 30 days. They fall in ${new Set(hiIll.map(d => `${d.run}:${d.seed}`)).size} of the 10 seed-runs, in ${new Set(hiIll.map(d => d.troop)).size} communities, between day ${f(Math.min(...hiIll.map(d => d.day as number)), 0)} and day ${f(Math.max(...hiIll.map(d => d.day as number)), 0)} of the run.`);
  K.push(`- **K3. All twelve runs.** ${illN} first-year deaths labelled illness, ${illAtBase} of them drawn at multiplier 1.00; first-year deaths of other causes: ${sum(perRun.map(p => p.outbreak))} outbreak, ${sum(perRun.map(p => p.infanticide))} infanticide, ${sum(perRun.map(p => p.orphan))} orphan, ${sum(perRun.map(p => p.starvation))} starvation.`);
  K.push(`- **K4. The hazard.** Baseline hazard of a healthy uninjured infant ${f(h0, 4)} per year; ${f(muRun, 2)} illness deaths under one year expected per run (${f(exRun, 1)} infant-years); the SD Poisson noise alone gives one run's first-year mortality: ${f(sdPois, 3)}, against a band (${band}) ${f(bandWidth, 2)} wide; one death moves a run's value by about ${f((1 - Math.exp(-3 / exRun)) - (1 - Math.exp(-2 / exRun)), 3)}.`);
  K.push(`- **K5. Energy state.** Mean condition of infants under six months: ${arms.map(a => `${a} ${f(eOf(a).condA, 3)}`).join(', ')}; their mothers' mean reserves ÷ store: ${arms.map(a => `${a} ${f(eOf(a).motherA, 3)}`).join(', ')}; milk kcal per infant-day: ${arms.map(a => `${a} ${f(eOf(a).milkA, 0)}`).join(', ')}; seed-runs of 20 in which an infant under six months was ever below condLow: ${arms.map(a => `${a} ${eOf(a).belowA}`).join(', ')}. Illness deaths under one year: ${arms.map(a => `${a} ${armOf(a).ill}`).join(', ')}.`);
  K.push(`- **K6. The 0.5 arm against the other two.** Illness deaths under one year per infant-year: ${arms.map(a => `${a} ${f(armOf(a).illRate, 3)} (${armOf(a).ill} / ${f(armOf(a).ex, 1)})`).join(', ')}. Exact conditional test, W50 against the rest: rate ratio ${f(tOf('W50').ratio, 2)}, p = ${f(tOf('W50').two, 3)} two-sided (${f(tOf('W50').upper, 3)} upper tail). Run as the unit, exact permutation of the scored row: p = ${f(pOf('W50', 'scored T-DEM-1').two, 3)} two-sided (${f(pOf('W50', 'scored T-DEM-1').upper, 3)} upper tail); of truth first-year mortality: p = ${f(pOf('W50', 'truth q1, all causes').two, 3)} (${f(pOf('W50', 'truth q1, all causes').upper, 3)}). Three arms at once: p = ${f(t3.scored.p, 3)} (scored), ${f(t3.truth.p, 3)} (truth). Twelve runs alike given their total: p = ${f(geHat / NSIM, 3)}.`);
  K.push(`- **K7. The level.** Illness deaths under one year over the twelve runs: ${totIll} against ${f(mu, 1)} expected at the baseline hazard (Poisson P = ${f(poisGe(totIll, mu), 3)}); without the 0.5 arm: ${totIll - w50.ill} against ${f(mu - w50.expected, 1)} (P = ${f(poisGe(totIll - w50.ill, mu - w50.expected), 3)}); the 0.5 arm alone: ${w50.ill} against ${f(w50.expected, 1)} (P = ${f(poisGe(w50.ill, w50.expected), 3)}); the highest run alone (${order[0].label}): ${top} against ${f(order[0].expected, 2)} (P = ${f(poisGe(top, order[0].expected), 4)}; ${f(pTop, 3)} that some run of twelve reaches it). Illness and old-age deaths at one year or more: ${older.d} against ${f(older.exp, 1)} expected (P(X ≥) = ${f(poisGe(older.d, older.exp), 3)}).`);
  K.push(`- **K8. Scored against truth, the two high runs.** ${hi.map(p => `${p.label}: scored ${p.scoredDeaths} deaths in ${f(p.scoredYears, 1)} infant-years, truth ${p.n} in ${f(p.ex1, 1)}`).join('; ')}. ${rowsS.filter(r => high.includes(r[0] as string)).map(r => `${r[0]} seed ${r[1]}: scored but not a first-year death in truth: ${r[4]}; a first-year death in truth but not scored: ${r[5]}`).join('. ') || 'No difference by individual'}.`);
  K.push(`- **K9. Other events.** Epidemic arrivals over the whole run and outbreak deaths of all ages in the window: ${perRun.map(p => `${p.label} ${p.arrivals} and ${p.allOutbreak}`).join('; ')}. Outbreak deaths under one year (truth): ${perRun.map(p => p.outbreak).join(', ')} in the same order.`);
  const key = K.join('\n') + '\n';
  J.key = K;

  // ── 7. outbreaks ──
  L.push('### G9. Outbreaks and the other events (whole run for arrivals; scored window for deaths)', '');
  L.push(table(['run', 'epidemic arrivals (5 seeds, whole run)', 'outbreak deaths, all ages', 'outbreak deaths < 1 y', 'infanticides < 1 y', 'orphan deaths < 1 y', 'deaths, all ages', 'starvation, all ages', 'female transfers seen'],
    runs.map((r, i) => [r.label, perRun[i].arrivals, perRun[i].allOutbreak, perRun[i].outbreak, perRun[i].infanticide, perRun[i].orphan, perRun[i].allDeaths, perRun[i].allStarve, sum(r.ex.map(e => e.transfers))])), '');

  const md = L.join('\n') + '\n';
  writeFileSync(join(o.out, 'report.json'), JSON.stringify(J, null, 1) + '\n');
  writeFileSync(join(o.out, 'report.md'), md);
  if (o.md) writeFileSync(o.md, md);
  writeFileSync(join(o.out, 'key.md'), key);
  if (o.note) {
    if (!existsSync(o.note)) throw new Error(`no note at ${o.note}`);
    let t = readFileSync(o.note, 'utf8');
    for (const [name, body] of [['key numbers', key], ['tables', md]] as const) {
      const BEGIN = `<!-- BEGIN ${name}: generated by scripts/e1v-infant-illness.ts report, do not edit -->`, END = `<!-- END ${name} -->`, i = t.indexOf(BEGIN), j = t.indexOf(END);
      if (i < 0 || j < i) throw new Error(`${o.note}: no "${name}" markers`);
      t = t.slice(0, i + BEGIN.length) + '\n\n' + body + '\n' + t.slice(j);
    }
    writeFileSync(o.note, t);
  }
  console.log(key + '\n' + md);
}
