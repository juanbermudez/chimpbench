// Stage V1 (docs/staging/v1-field.md): the two files the page "How close to the wild" fetches on first open.
//
//   pnpm exec tsx scripts/field-bundle.ts            # writes public/field/targets-lite.json and public/field/reference.json
//   pnpm exec tsx scripts/field-bundle.ts --check    # rebuilds both in memory; exits 1 unless every value equals its source
//                                                    # and the files on disk equal the rebuild byte for byte
//   --frozen <dir>   where the frozen reference checkouts live (default: .claude/worktrees of the main checkout)
//
// Sources, all read-only: data/targets.json of this checkout (bands, field rows as text, sources, flags) and the frozen
// checkouts bench-y3, bench-wean and bench-e1x3 (each arm's <arm>.scorecard.json, <arm>.json from e-bench, params.json).
// Nothing is written in the frozen checkouts. Sealed rows (src/field/metrics.ts `sealed`) never enter either file, and
// neither file carries a host name or a path of this machine (public/ is deployed).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { METRICS } from '../src/field/metrics';
import { truthPlaceholder, type TargetSpec } from '../src/field/targets';
import { NEEDS_YEAR, parsePartBands, staleRows, type Freeze } from './e-bench';
import { homeOf, ALSO } from '../src/yardstick/sections';
import type { LiteFlag, LiteTarget, LiteWindow, RefArm, RefRow, ReferenceFile, TargetsLite } from '../src/yardstick/bundle';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const CHECK = argv.includes('--check');
const OUT_DIR = resolve(ROOT, 'public/field');
const LITE_FILE = resolve(OUT_DIR, 'targets-lite.json'), REF_FILE = resolve(OUT_DIR, 'reference.json');

function frozenDir(): string {
  const o = opt('frozen');
  if (o) return resolve(o);
  // the main checkout is the parent of the git common directory; its worktrees hold the frozen reference checkouts
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim();
  return resolve(dirname(common), '.claude/worktrees');
}
const FROZEN = frozenDir();
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;

// ---------------------------------------------------------------------------------------------------------------
// targets-lite.json

type Target = {
  id: string; metric: string; definition?: string; observer: { protocol: string; interval_min: number | null; unit: string };
  field: { population: string; years: string; value: string; n: string; method: string; source: string; note: string }[];
  accept: { lo: number | null; hi: number | null; units: string; basis: string }; evidence: string; role: 'fitted' | 'held-out';
  encoded: boolean; notes?: string; sources?: string[]; tuned?: string; revisedPostFreeze?: string; protocolRevisedPostHoc?: boolean;
  compromised?: boolean; compromisedReason?: string; heldAsFail?: string; notScorable?: string; partiallyEncoded?: string; contested?: boolean;
  instrumentWarning?: string; scoredOn?: string; truthDefinition?: { definition: string }; comparisonBand?: { lo: number; hi: number; units: string; basis: string };
};
interface TargetsJson { protocolFreeze: Freeze & { hash: string; date: string; stage: string }; targets: Target[]; sources: Record<string, { authors: string; year: number | string; title: string; journal: string; doi: string }> }

/** Rows the scorer never computes outside the long demography proof (stage C8): never in either file. */
export function sealedIds(): Set<string> { return new Set(METRICS.filter(m => m.sealed).map(m => m.id)); }

/** Minimum windows beyond NEEDS_YEAR (scripts/e-bench.ts, from each metric's protocol). Design assumption, stage V1. */
const DECADES: Readonly<Record<string, string>> = {
  'T-DEM-2': 'a life table of adults needs decades of natural aging (the scorer’s design: 40 years × 5 worlds)',
  'T-DEM-3': 'survival to 45 needs decades of natural aging (the scorer’s design: 40 years × 5 worlds)',
  'T-DEM-11': 'first births of females known from birth need decades of natural aging',
  'T-DEM-12': 'intervals between births need decades of natural aging',
  'T-DEM-13': 'intervals between births need decades of natural aging',
  'T-RNG-6': 'range variability is a ratio across years of annual ranges',
  'T-SOC-1': 'bond persistence is counted in years',
  'T-SOC-7': 'alpha tenures last years',
  'T-SOC-13': 'recognition of a former partner after decades',
};
const EXPERIMENTS: Readonly<Record<string, string>> = {
  'T-IGE-4': 'stranger pant-hoot playbacks (src/field/experiments.ts), run by the field teams on copies of the world, not in a watched world',
  'T-COM-11': 'snake-model trials (src/field/experiments.ts), run by the field teams on copies of the world, not in a watched world',
};
/** Days of follows that make one rotation of the field teams (src/field/config.ts rotationBlockDays). */
const ROTATION_DAYS = 10;
const YEAR = 365, DECADES_DAYS = 20 * 365;

function windowOf(t: Target, scenario: boolean): LiteWindow {
  if (EXPERIMENTS[t.id]) return { kind: 'experiment', days: null, why: `needs field experiments: ${EXPERIMENTS[t.id]}` };
  if (scenario) return { kind: 'scenario', days: null, why: 'a scenario row, scored on paired scenario runs (scripts/field-scenario.ts, scripts/c9-scenario.ts), never in a watched world' };
  if (DECADES[t.id]) return { kind: 'decades', days: DECADES_DAYS, why: DECADES[t.id] };
  if (NEEDS_YEAR[t.id]) return { kind: 'year', days: YEAR, why: `needs a year: ${NEEDS_YEAR[t.id]} (scripts/e-bench.ts NEEDS_YEAR)` };
  return { kind: 'days', days: ROTATION_DAYS, why: `needs at least ${ROTATION_DAYS} days: one rotation of the field teams’ follows (design assumption)` };
}

const TUNED_LINE: Readonly<Record<string, string>> = {
  'T-PAT-1': 'The patrol hazard was chosen on seed 48 against this band: inside it shows the tuning worked, not that patrols are realistic.',
  'T-ACT-2': 'Travel and party settings were set in sweeps against this band: inside it shows the tuning worked.',
  'T-RNG-4': 'Tuned with the travel share (the same settings), and reported as a fail whatever its value.',
  'T-PTY-1': 'Party-cohesion settings were added and weighted against this band: a calibration result, not evidence.',
  'T-COM-5': 'Set by an offline calibration against this band: a calibration result, not evidence.',
};
/** Bands written for a community size (accept.basis), with the size they name. */
const SCALED: Readonly<Record<string, { words: string; members?: number; adultMales?: [number, number] }>> = {
  'T-RNG-1': { words: 'written for a community of 22 members with 7 adult males', members: 22 },
  'T-PTY-1': { words: 'scaled between Kanyawara’s parties (a community of about 45 to 50) and Kanyawara’s composition scaled to the model’s community' },
  'T-PAT-1': { words: 'written for communities of 3 to 10 adult males (Gombe and Taï); Ngogo, with 25 males, patrols more', adultMales: [3, 10] },
  'T-HUN-1': { words: 'Kanyawara’s and Ngogo’s rates per adult male, scaled to the model’s adult males' },
  'T-FIS-1': { words: 'no fission below about 10 adult males' },
};

function flagsOf(t: Target): LiteFlag[] {
  const f: LiteFlag[] = [];
  const firstCompromise = (notes = '') => { const s = notes.split(/(?<=\.)\s+/); const i = s.findIndex(x => /compromised/i.test(x)); return i >= 0 ? s.slice(i, i + 2).join(' ') : notes; };
  if (t.compromised) f.push({ key: 'compromised', label: 'compromised: reported, never counted', reason: t.compromisedReason ?? firstCompromise(t.notes) });
  if (t.tuned) f.push({ key: 'tuned', label: 'tuned', reason: t.tuned });
  if (t.heldAsFail) f.push({ key: 'heldAsFail', label: 'held as a fail', reason: `reported as a fail whatever its value: ${t.heldAsFail}` });
  if (t.notScorable) f.push({ key: 'notScorable', label: 'not scorable', reason: t.notScorable });
  if (t.contested) f.push({ key: 'contested', label: 'contested', reason: 'the field value itself is disputed: a measured bias in its method; reported beside a corrected band, never counted' });
  if (t.encoded) f.push({ key: 'encoded', label: 'encoded', reason: 'the mechanism was designed from this pattern; a match is weak evidence' });
  if (t.partiallyEncoded) f.push({ key: 'partiallyEncoded', label: 'partly encoded', reason: t.partiallyEncoded });
  if (t.revisedPostFreeze) f.push({ key: 'revisedPostFreeze', label: 'revised after the freeze', reason: t.revisedPostFreeze });
  if (t.instrumentWarning) f.push({ key: 'instrumentWarning', label: 'instrument below its bar', reason: t.instrumentWarning });
  if (t.protocolRevisedPostHoc) f.push({ key: 'protocolRevisedPostHoc', label: 'method revised after values were seen', reason: 'its protocol was changed after its value had been seen, for a source-text or bug reason (data/targets.json protocolLog)' });
  return f;
}

export function buildLite(file: TargetsJson): TargetsLite {
  const sealed = sealedIds();
  const metric = new Map(METRICS.map(m => [m.id, m]));
  const targets: LiteTarget[] = [];
  const cited = new Set<string>();
  for (const t of file.targets) {
    if (sealed.has(t.id)) continue;
    const m = metric.get(t.id);
    const scenario = /\(scenario/.test(m?.protocol ?? '') || t.observer.unit === 'scenario' || /^scenario/.test(t.observer.protocol);
    // part bands as the scorer writes them (src/field/targets.ts PART_BANDS, through its band text), read as e-bench reads them
    const pb = t.accept.lo === null && t.accept.hi === null ? parsePartBands(truthPlaceholder(t as unknown as TargetSpec).band) : null;
    const partBands = pb ?? (m?.bandParts ? Object.fromEntries(m.bandParts.map(k => [k, { lo: t.accept.lo, hi: t.accept.hi }])) : undefined);
    const row: LiteTarget = {
      id: t.id, metric: t.metric, definition: t.definition ?? '', method: t.observer.protocol, unit: t.observer.unit,
      role: t.role, encoded: t.encoded, evidence: t.evidence, accept: { lo: t.accept.lo, hi: t.accept.hi, units: t.accept.units, basis: t.accept.basis },
      ...(partBands ? { partBands } : {}),
      field: t.field.map(x => ({ population: x.population, years: x.years, value: x.value, n: x.n, method: x.method, source: x.source, note: x.note })),
      sources: [...(t.sources ?? [])], flags: flagsOf(t), truth: t.scoredOn === 'truth',
      ...(t.comparisonBand ? { comparisonBand: { lo: t.comparisonBand.lo, hi: t.comparisonBand.hi, units: t.comparisonBand.units, basis: t.comparisonBand.basis } } : {}),
      scaleSensitive: !!m?.scaleSensitive,
      section: homeOf(t.id), also: ALSO[t.id] ? [...ALSO[t.id]] : [],
      window: windowOf(t, scenario),
      ...(SCALED[t.id] ? { scaled: SCALED[t.id] } : {}),
      ...(TUNED_LINE[t.id] ? { tunedLine: TUNED_LINE[t.id] } : {}),
      ...(m?.na || m?.structural ? { notMeasured: (m.na ?? m.structural)! } : {}),
    };
    for (const s of t.sources ?? []) cited.add(s);
    for (const x of t.field) for (const s of x.source.split(/[;,]\s*/)) if (file.sources[s]) cited.add(s);
    targets.push(row);
  }
  const sources: TargetsLite['sources'] = {};
  for (const k of [...cited].sort()) { const s = file.sources[k]; if (s) sources[k] = { authors: s.authors, year: s.year, title: s.title, journal: s.journal ?? '', doi: s.doi ?? '' }; }
  const fz = file.protocolFreeze;
  return { version: 1, freeze: { hash: fz.hash, date: fz.date, stage: fz.stage }, sealed: sealed.size, targets, sources };
}

// ---------------------------------------------------------------------------------------------------------------
// reference.json

interface CardRow { id: string; verdict?: string; note?: string; perSeed?: (number | null)[]; pooled?: number | null; parts?: Record<string, number | null>; truth?: number | null; n?: number; interval?: [number, number] | null; flags?: string[]; sealed?: string }
interface Card { manifest: { date: string; protocolHash: string; seeds: number[]; days: number; burnInDays: number; profile: string; params: Record<string, number> }; rows: CardRow[]; counts: { seed: number; patrols: number; truthPatrols: number }[];
  accuracy?: { patrol?: { precision: number; recall: number; classified: number; truthEpisodes: number }; encounterParty?: { precision: number; recall: number } } }
interface BenchRowJ { id: string; pooled: number | null; perSeed: (number | null)[]; parts: Record<string, number | null>; verdict: string; flags: string[]; note?: string }
interface Bench { date: string; git: { commit: string }; rows: BenchRowJ[]; truth?: Record<string, { n: number }[]>; viability: { perSeed: { seed: number; livingStart: number; livingEnd: number; births: number; deaths: number; starvationDeaths: number; deathsByCause: Record<string, number> }[]; verdict: { pass: boolean; reasons: string[]; births: number; deaths: number; starvationDeaths: number; minLivingShare: number } } }

export const ARMS: readonly { id: string; checkout: string; name: string; what: string }[] = [
  { id: 'Y3-T0', checkout: 'bench-y3', name: 'Today’s model', what: 'the default model with no overrides: patrols from a tuned hazard, no energy budget' },
  { id: 'Y3-W50', checkout: 'bench-y3', name: 'Working base', what: 'the Track E working base (stack S39, half the pith fibre swallowed): energy, water and nursing ledgers, patrols from the males’ own decision' },
  { id: 'Y3-W50-wean', checkout: 'bench-wean', name: 'Working base, weaning decided by the mother', what: 'the working base with weanOutcome 1' },
  { id: 'Y3-W50-gut75', checkout: 'bench-e1x3', name: 'Working base, smaller young guts (0.75)', what: 'the working base with gutSizeExp 0.75: a young animal’s gut scales with body mass to the power 0.75' },
  { id: 'Y3-W50-gut875', checkout: 'bench-e1x3', name: 'Working base, smaller young guts (0.875)', what: 'the working base with gutSizeExp 0.875' },
];
const armDir = (a: (typeof ARMS)[number]) => resolve(FROZEN, a.checkout, 'artifacts/validation/e/runs', a.id);

export function buildArm(a: (typeof ARMS)[number], keep: Set<string>, freeze: Freeze): RefArm {
  const dir = armDir(a);
  const card = readJson<Card>(resolve(dir, `${a.id}.scorecard.json`));
  const bench = readJson<Bench>(resolve(dir, `${a.id}.json`));
  const overrides = readJson<Record<string, number>>(resolve(dir, 'params.json'));
  const stale = staleRows(freeze, card.manifest.protocolHash, card.manifest.date);
  const byBench = new Map(bench.rows.map(r => [r.id, r]));
  const rows: Record<string, RefRow> = {};
  for (const c of card.rows) {
    if (!keep.has(c.id)) continue;
    const b = byBench.get(c.id);
    const truthRow = (c.note ?? '').startsWith('simulation-truth row') || c.verdict === 'n/a' && !!bench.truth?.[c.id];
    if (truthRow && b) {
      const n = (bench.truth?.[c.id] ?? []).reduce((s, v) => s + (v.n ?? 0), 0);
      rows[c.id] = { pooled: b.pooled ?? null, perSeed: [...(b.perSeed ?? [])], interval: null, n, parts: { ...(b.parts ?? {}) }, verdict: b.verdict, note: b.note ?? '', flags: [...b.flags], truthValue: null, from: 'truth' };
    } else {
      rows[c.id] = { pooled: c.pooled ?? null, perSeed: [...(c.perSeed ?? [])], interval: c.interval ? [c.interval[0], c.interval[1]] : null, n: c.n ?? 0, parts: { ...(c.parts ?? {}) }, verdict: c.verdict ?? '', note: c.note ?? '', flags: [...(c.flags ?? [])], truthValue: c.truth ?? null, from: 'card' };
    }
  }
  const v = bench.viability;
  return {
    id: a.id, name: a.name, what: a.what, overrides, seeds: [...card.manifest.seeds], days: card.manifest.days, burnInDays: card.manifest.burnInDays, profile: card.manifest.profile,
    runDate: card.manifest.date.slice(0, 10), commit: bench.git.commit.slice(0, 8),
    protocol: { hash: card.manifest.protocolHash, current: card.manifest.protocolHash === freeze.hash },
    recount: Object.fromEntries([...stale].filter(([id]) => keep.has(id))),
    viability: { pass: v.verdict.pass, reasons: [...v.verdict.reasons], births: v.verdict.births, deaths: v.verdict.deaths, starvationDeaths: v.verdict.starvationDeaths, minLivingShare: v.verdict.minLivingShare,
      worlds: v.perSeed.map(s => ({ seed: s.seed, livingStart: s.livingStart, livingEnd: s.livingEnd, births: s.births, deaths: s.deaths, starvationDeaths: s.starvationDeaths, deathsByCause: { ...s.deathsByCause } })) },
    patrolCatch: card.counts.map(c => ({ seed: c.seed, detected: c.patrols, truth: c.truthPatrols })),
    instrument: {
      patrol: card.accuracy?.patrol ? { precision: card.accuracy.patrol.precision, recall: card.accuracy.patrol.recall, classified: card.accuracy.patrol.classified, truthEpisodes: card.accuracy.patrol.truthEpisodes } : null,
      encounter: card.accuracy?.encounterParty ? { precision: card.accuracy.encounterParty.precision, recall: card.accuracy.encounterParty.recall } : null,
    },
    rows,
  };
}

/** How the today's-model arm's match with today's default world is worded: from the registry defaults and the golden
 * test world at the run's commit against this checkout's (the design's one-time check). */
export function todayMatch(): string {
  type Reg = { params: { id: string; value: unknown; units: string }[] };
  const then = readJson<Reg>(resolve(FROZEN, 'bench-y3/data/params.json')), now = readJson<Reg>(resolve(ROOT, 'data/params.json'));
  const a = new Map(then.params.map(p => [p.id, p])), b = new Map(now.params.map(p => [p.id, p]));
  const changed = [...b.keys()].filter(k => a.has(k) && JSON.stringify(a.get(k)!.value) !== JSON.stringify(b.get(k)!.value));
  const removed = [...a.keys()].filter(k => !b.has(k));
  const added = [...b.keys()].filter(k => !a.has(k));
  const offSwitches = added.filter(k => (b.get(k)!.units === 'switch' || b.get(k)!.units === 'level') && b.get(k)!.value === 0);
  const golden = readFileSync(resolve(FROZEN, 'bench-y3/tests/fixtures/golden-world.json'), 'utf8') === readFileSync(resolve(ROOT, 'tests/fixtures/golden-world.json'), 'utf8');
  const sameDefaults = !changed.length && !removed.length;
  const lead = sameDefaults && golden ? 'Probably the same model as this world' : 'Possibly not the same model as this world';
  return `${lead}: since that run no existing default changed${changed.length ? ` (except ${changed.join(', ')})` : ''}${removed.length ? `, ${removed.length} settings were removed` : ''}; ${added.length} settings were added, ${offSwitches.length} of them switches that default to off and ${added.length - offSwitches.length} values read under switches (${added.filter(k => !offSwitches.includes(k)).join(', ')}); the golden test world is ${golden ? 'unchanged' : 'changed'}. Not re-verified by a run.`;
}

export function buildReference(file: TargetsJson, lite: TargetsLite): ReferenceFile {
  const keep = new Set(lite.targets.map(t => t.id));
  return { version: 1, freeze: file.protocolFreeze.hash, todayMatch: todayMatch(), arms: ARMS.map(a => buildArm(a, keep, file.protocolFreeze)) };
}

const stringify = (x: unknown) => JSON.stringify(x) + '\n';

// ---------------------------------------------------------------------------------------------------------------
// --check: every value equal to its source

function checkAll(file: TargetsJson, lite: TargetsLite, ref: ReferenceFile): string[] {
  const bad: string[] = [];
  const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const sealed = sealedIds();
  // targets-lite against data/targets.json, field by field
  const src = new Map(file.targets.map(t => [t.id, t]));
  for (const t of lite.targets) {
    const s = src.get(t.id);
    if (!s) { bad.push(`${t.id}: not in data/targets.json`); continue; }
    if (sealed.has(t.id)) bad.push(`${t.id}: sealed row in targets-lite`);
    if (t.metric !== s.metric || t.definition !== (s.definition ?? '') || t.method !== s.observer.protocol || t.unit !== s.observer.unit) bad.push(`${t.id}: name, definition or method differs`);
    if (t.role !== s.role || t.encoded !== s.encoded || t.evidence !== s.evidence) bad.push(`${t.id}: role, encoded or evidence differs`);
    if (!eq(t.accept, { lo: s.accept.lo, hi: s.accept.hi, units: s.accept.units, basis: s.accept.basis })) bad.push(`${t.id}: band differs`);
    if (!eq(t.field, s.field.map(x => ({ population: x.population, years: x.years, value: x.value, n: x.n, method: x.method, source: x.source, note: x.note })))) bad.push(`${t.id}: field rows differ`);
    if (!eq(t.sources, s.sources ?? [])) bad.push(`${t.id}: sources differ`);
    if (t.truth !== (s.scoredOn === 'truth')) bad.push(`${t.id}: truth flag differs`);
    for (const k of ['compromised', 'tuned', 'heldAsFail', 'notScorable', 'contested', 'partiallyEncoded', 'revisedPostFreeze', 'protocolRevisedPostHoc'] as const)
      if (!!s[k] !== t.flags.some(f => f.key === k)) bad.push(`${t.id}: flag ${k} differs`);
    if (t.partBands) for (const [k, b] of Object.entries(t.partBands)) if (!(typeof b.lo === 'number' || b.lo === null)) bad.push(`${t.id}: part band ${k} not numeric`);
  }
  for (const s of file.targets) if (!sealed.has(s.id) && !lite.targets.some(t => t.id === s.id)) bad.push(`${s.id}: missing from targets-lite`);
  if (lite.sealed !== sealed.size) bad.push('sealed count differs');
  for (const [k, s] of Object.entries(lite.sources)) { const o = file.sources[k]; if (!o || o.authors !== s.authors || o.year !== s.year || o.title !== s.title || (o.doi ?? '') !== s.doi) bad.push(`source ${k} differs`); }
  // reference.json against each arm's scorecard and e-bench files
  for (const arm of ref.arms) {
    const a = ARMS.find(x => x.id === arm.id)!, dir = armDir(a);
    const card = readJson<Card>(resolve(dir, `${a.id}.scorecard.json`)), bench = readJson<Bench>(resolve(dir, `${a.id}.json`));
    const cRows = new Map(card.rows.map(r => [r.id, r])), bRows = new Map(bench.rows.map(r => [r.id, r]));
    for (const [id, r] of Object.entries(arm.rows)) {
      if (sealed.has(id)) bad.push(`${arm.id} ${id}: sealed row in reference`);
      if (r.from === 'card') {
        const c = cRows.get(id)!;
        if (!eq(r.pooled, c.pooled ?? null) || !eq(r.perSeed, c.perSeed ?? []) || !eq(r.interval, c.interval ?? null) || r.n !== (c.n ?? 0) || !eq(r.parts, c.parts ?? {}) || r.verdict !== (c.verdict ?? '') || r.note !== (c.note ?? ''))
          bad.push(`${arm.id} ${id}: differs from the scorecard`);
      } else {
        const b = bRows.get(id)!, n = (bench.truth?.[id] ?? []).reduce((s, v) => s + (v.n ?? 0), 0);
        if (!eq(r.pooled, b.pooled ?? null) || !eq(r.perSeed, b.perSeed ?? []) || r.n !== n || !eq(r.parts, b.parts ?? {}) || r.verdict !== b.verdict) bad.push(`${arm.id} ${id}: differs from e-bench's truth row`);
      }
    }
    for (const c of card.rows) if (!sealed.has(c.id) && !arm.rows[c.id]) bad.push(`${arm.id} ${c.id}: missing`);
    const v = bench.viability;
    if (arm.viability.births !== v.verdict.births || arm.viability.deaths !== v.verdict.deaths || arm.viability.pass !== v.verdict.pass || arm.viability.starvationDeaths !== v.verdict.starvationDeaths) bad.push(`${arm.id}: viability differs`);
    v.perSeed.forEach((s, i) => { const w = arm.viability.worlds[i]; if (!w || w.seed !== s.seed || w.births !== s.births || w.deaths !== s.deaths || !eq(w.deathsByCause, s.deathsByCause) || w.livingStart !== s.livingStart || w.livingEnd !== s.livingEnd) bad.push(`${arm.id} seed ${s.seed}: births or deaths by cause differ`); });
    const sumCause = arm.viability.worlds.reduce((n, w) => n + Object.values(w.deathsByCause).reduce((a, b) => a + b, 0), 0);
    if (sumCause !== arm.viability.deaths) bad.push(`${arm.id}: deaths by cause do not add up to the deaths`);
    if (arm.commit !== bench.git.commit.slice(0, 8)) bad.push(`${arm.id}: commit differs`);
    const ap = card.accuracy?.patrol, ip = arm.instrument.patrol;
    if (!!ap !== !!ip || (ap && ip && (ap.precision !== ip.precision || ap.recall !== ip.recall || ap.classified !== ip.classified || ap.truthEpisodes !== ip.truthEpisodes))) bad.push(`${arm.id}: patrol detector check differs`);
    card.counts.forEach((c, i) => { const p = arm.patrolCatch[i]; if (!p || p.seed !== c.seed || p.detected !== c.patrols || p.truth !== c.truthPatrols) bad.push(`${arm.id} seed ${c.seed}: patrol counts differ`); });
  }
  // nothing of this machine in either file
  const host = hostname();
  for (const [name, text] of [['targets-lite', stringify(lite)], ['reference', stringify(ref)]] as const) {
    for (const needle of ['/Volumes/', '/Users/', '/private/', '\\\\', ROOT, FROZEN, ...(host ? [host] : [])]) if (needle && text.includes(needle)) bad.push(`${name}: contains "${needle}"`);
    for (const id of sealed) if (text.includes(`"${id}"`)) bad.push(`${name}: names sealed row ${id}`);
  }
  return bad;
}

function main() {
  const file = readJson<TargetsJson>(resolve(ROOT, 'data/targets.json'));
  for (const a of ARMS) if (!existsSync(armDir(a))) throw new Error(`reference arm ${a.id} not found (looked in the frozen checkout ${a.checkout})`);
  const lite = buildLite(file), ref = buildReference(file, lite);
  const liteText = stringify(lite), refText = stringify(ref);
  const bad = checkAll(file, lite, ref);
  if (CHECK) {
    if (!existsSync(LITE_FILE) || readFileSync(LITE_FILE, 'utf8') !== liteText) bad.push('public/field/targets-lite.json differs from the rebuild');
    if (!existsSync(REF_FILE) || readFileSync(REF_FILE, 'utf8') !== refText) bad.push('public/field/reference.json differs from the rebuild');
    if (bad.length) { console.error(`field-bundle --check: ${bad.length} problem(s)\n  ${bad.join('\n  ')}`); process.exit(1); }
    const rows = ref.arms.reduce((n, a) => n + Object.keys(a.rows).length, 0);
    console.log(`field-bundle --check: ok. ${lite.targets.length} targets (${lite.sealed} sealed rows left out), ${ref.arms.length} arms, ${rows} reference rows; every value equals its source; files equal the rebuild.`);
    return;
  }
  if (bad.length) { console.error(`field-bundle: ${bad.length} problem(s)\n  ${bad.join('\n  ')}`); process.exit(1); }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(LITE_FILE, liteText); writeFileSync(REF_FILE, refText);
  console.log(`wrote public/field/targets-lite.json (${(liteText.length / 1024).toFixed(0)} KB, ${lite.targets.length} targets) and public/field/reference.json (${(refText.length / 1024).toFixed(0)} KB, ${ref.arms.length} arms)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
