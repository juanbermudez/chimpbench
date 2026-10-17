// Stage R16 (docs/staging/r16-prereg.md §5, §6, §10): the census, the selection and the labels. A census writes, at every
// fresh decision (a rules world) or every kind ask (a learner run, a sibling run), what the packet's words and the kind
// menu say, and nothing a label is made of. The selection reads the census alone, in hash order, before any label exists.
// The labels are made at the selected decisions by stage R15's two teachers (scripts/lib/r15-training.ts), in one-day
// segments that each land on the census's own day hash. Nothing here writes a world: the teachers put the decision
// version back and never draw from world.rng (checked at every label).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Kind } from '../../src/decide/facts';
import { optionKey } from '../../src/kernel/decode';
import type { KernelRequest } from '../../src/kernel/types';
import { r15Packet } from '../../src/providers/packet';
import { candidateMeta, computeCandidates } from '../../src/sim/candidates';
import { dayPhase } from '../../src/sim/environment';
import { optionKind } from '../../src/sim/menu';
import { paramsOf } from '../../src/sim/params';
import { index, ix, TICK_HOURS } from '../../src/sim/state';
import { createWorld, tickWorld } from '../../src/simulation';
import type { Candidate, Chimp, World } from '../../src/types';
import { worldHash } from '../../tests/fixtures/golden';
import { splitOf } from '../r4-contexts';
import { tapRulesDecisions } from '../r8-contexts';
import { writeAtomic } from './checkpoint';
import { readCkpt, writeCkpt } from './r10-run';
import { published } from './soft-labels';
import { digest, normalize, r15TrainingRows, type R15Row, type R15LabelDetail } from './r15-training';
import { cellOf, kindStratum, menuShape, targetStrata, wordsOf, type KindStratum, type MenuShape, type TargetStratum, type Words } from './r16-strata';
import { inNest } from './timing-card';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DAY = Math.round(24 / TICK_HOURS);
/** The registered worlds and seeds (§3, §4.1). */
export const R16 = {
  paramsFile: 'docs/staging/integrator-kit/params/M6-W50.json', burnInDays: 30, days: 10,
  trainSeeds: [48, 7] as number[], testSeed: 21,
  population: { 'r16-agg-s7': 3701, 'r16-agg-s11': 3187 } as Record<string, number>, focalSeeds: [3079, 3517], sealedSeeds: [3011, 3643],
  /** Seeds this stage never runs: spent, opened, reserved by another stage, or sealed. */
  refused: [3613, 4111, 4222, 3457, 3823, 4333, 4444, 3011, 3643],
};
export const LOOP_SWITCHES = { observeV4: 1, observeV5: 1, menuParity: 1 } as const;
export const R15_SWITCHES = { resourceTargets: 1, activityFirst: 2 } as const;
export const paramsSha = (): string => createHash('sha256').update(readFileSync(resolve(ROOT, R16.paramsFile))).digest('hex');
/** The working base with the packet 5 switches (`plain`) and, `switched`, the R15 path's two switches, all from the first tick. */
export function r16Params(switched: boolean): Record<string, number> {
  const raw = JSON.parse(readFileSync(resolve(ROOT, R16.paramsFile), 'utf8')) as Record<string, number>;
  return { ...raw, ...LOOP_SWITCHES, ...(switched ? R15_SWITCHES : {}) };
}
/** The world after the rules' burn-in (or after `burnInDays` of it). */
export function burnIn(seed: number, switched: boolean, burnInDays = R16.burnInDays): World {
  const w = createWorld(seed, { profile: 'field', params: r16Params(switched) });
  for (let i = 0; i < burnInDays * DAY; i++) tickWorld(w);
  return w;
}
/** The window day (1-based) a world time falls in: whole days since the end of the burn-in. */
export const windowDay = (w: World, burnInDays: number): number => Math.floor(w.time / 24) - burnInDays + 1;

export type Source = 'rules' | 'learner' | 'sibling';
export type Split = 'train' | 'dev' | 'test';
export interface CensusEntry {
  id: string; seed: number; source: Source; tick: number; day: number; chimpId: number; version: number; split: Split; h: string;
  words: Words; kind: KindStratum | null; targets: { stratum: TargetStratum; kind: Kind }[]; menu: MenuShape;
}
export const censusId = (source: Source, seed: number, tick: number, chimpId: number, version: number): string => `r16:${source}:${seed}:${tick}:${chimpId}:${version}`;
export const selectionHash = (id: string): string => createHash('sha256').update(`r16-select:${id}`).digest('hex');
/** One census line from a kind request (a packet the R15 path renders, or `words` read off another packet with the same shared lines). */
export function censusEntry(seed: number, source: Source, tick: number, day: number, chimpId: number, version: number, request: Pick<KernelRequest, 'context' | 'groups'> | null, words?: Words): CensusEntry {
  const w = words ?? wordsOf(r15Packet(request!.context)), menu = request ? menuShape(request) : { kinds: [], sizes: [] };
  const id = censusId(source, seed, tick, chimpId, version);
  return { id, seed, source, tick, day, chimpId, version, split: splitOf(seed, chimpId), h: selectionHash(id), words: w, kind: kindStratum(w), targets: targetStrata(w, menu), menu };
}

// ---------------------------------------------------------------------------------------------------------------------
// Selection (pure; §5.2, §10)
// ---------------------------------------------------------------------------------------------------------------------

export type Group = 'plain' | KindStratum | 'DUSK-ALONE' | TargetStratum;
export interface Plan { name: string; quotas: Partial<Record<Split, Partial<Record<Group, number>>>>; cap: number }
const tenth = (q: Partial<Record<Group, number>>): Partial<Record<Group, number>> => Object.fromEntries(Object.entries(q).map(([k, v]) => [k, Math.ceil((v as number) / 10)]));
const ZERO_TRAIN: Partial<Record<Group, number>> = { plain: 780, 'NEST-DAY-CO': 130, 'DUSK-ALONE': 130, 'DARK-OUT-EVENING': 130, 'DARK-OUT-MORNING': 65, 'FOOD-FALL': 130, WATER: 130 };
const ONE_TRAIN: Partial<Record<Group, number>> = { plain: 780, 'NEST-DAY-CO': 260, 'DUSK-LATE-ALONE': 130, 'DARK-OUT-EVENING': 130, 'DARK-OUT-MORNING': 65, 'FOOD-FALL': 130, WATER: 130 };
/** The registered plans: round zero's rules worlds, the held-out rules set, round one's learner worlds, the in-sample learner reading sets (H-S, H-L). */
export const PLANS: Record<'zero' | 'heldOut' | 'one' | 'evalLearner', Plan> = {
  zero: { name: 'zero', cap: 2, quotas: { train: ZERO_TRAIN, dev: tenth(ZERO_TRAIN) } },
  heldOut: { name: 'heldOut', cap: 2, quotas: { test: { plain: 1000, 'NEST-DAY-CO': 200, 'NEST-RISE-ALONE': 200, 'NEST-RISE-CO': 200, 'DUSK-EARLY-ALONE': 200, 'DUSK-LATE-ALONE': 200, 'DUSK-CO': 200, 'NEST-DARK': 200, 'DARK-OUT-EVENING': 200, 'DARK-OUT-MORNING': 200, 'FOOD-FALL': 200, WATER: 200 } } },
  one: { name: 'one', cap: 2, quotas: { train: ONE_TRAIN, dev: tenth(ONE_TRAIN) } },
  evalLearner: { name: 'evalLearner', cap: 2, quotas: { dev: { plain: 400, 'NEST-DAY-CO': 100, 'DUSK-LATE-ALONE': 100, 'DUSK-CO': 100, 'NEST-RISE-CO': 100, 'DARK-OUT-EVENING': 100 } } },
};
/** Which target row a selected decision gives: R15's hash choice (plain), none (a kind top-up), or the stratum's own group. */
export type TargetChoice = 'hash' | 'none' | { kinds: Kind[] };
export type Selected = CensusEntry & { via: Group; target: TargetChoice };
export const inGroup = (e: CensusEntry, g: Group): boolean => g === 'plain' ? true : g === 'DUSK-ALONE' ? e.kind === 'DUSK-EARLY-ALONE' || e.kind === 'DUSK-LATE-ALONE' : g === 'FOOD-FALL' || g === 'WATER' ? e.targets.some(t => t.stratum === g) : e.kind === g;
const targetOf = (e: CensusEntry, g: Group): TargetChoice => g === 'plain' ? 'hash' : g === 'FOOD-FALL' || g === 'WATER' ? { kinds: [e.targets.find(t => t.stratum === g)!.kind] } : 'none';
/**
 * The registered selection: per split, the plain sample first (uncapped), then each top-up in the plan's order, in hash
 * order, excluding decisions already chosen, at most `cap` per animal per window day. Reads the census alone.
 */
export function select(entries: CensusEntry[], plan: Plan, exclude: Set<string> = new Set()): Selected[] {
  const out: Selected[] = [], chosen = new Set<string>(exclude);
  for (const [split, quotas] of Object.entries(plan.quotas) as [Split, Partial<Record<Group, number>>][]) {
    const ordered = entries.filter(e => e.split === split && !exclude.has(e.id)).sort((a, b) => a.h.localeCompare(b.h) || a.id.localeCompare(b.id));
    for (const [g, quota] of Object.entries(quotas) as [Group, number][]) {
      const perDay = new Map<string, number>();
      let n = 0;
      for (const e of ordered) {
        if (n >= quota) break;
        if (chosen.has(e.id) || !inGroup(e, g)) continue;
        const key = `${e.chimpId}:${e.day}`;
        if (g !== 'plain' && (perDay.get(key) ?? 0) >= plan.cap) continue;
        chosen.add(e.id); out.push({ ...e, via: g, target: targetOf(e, g) }); n++; perDay.set(key, (perDay.get(key) ?? 0) + 1);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Labels at one decision (§4.2, §4.4, §5.3, §5.4)
// ---------------------------------------------------------------------------------------------------------------------

export interface R16Meta {
  source: Source; via: Group; day: number; tick: number; stratum: KindStratum | null; targets: TargetStratum[]; words: Words; cell: string;
  /** The act in progress: its kind, whether it came to its own end, and its position on the kind menu (-1: not offered). */
  carry: { kind: string | null; finished: boolean; index: number };
  /** In a finished nest: the nest-mates the rules count (nestCompanyValue's conditions) and of them those the packet does not list (P1). */
  company: { counted: number; unseen: number } | null;
  /** This row's teacher label from each half of its draws (the teacher-half check). */
  halves: [number[], number[]] | null;
  /** Kind rows: the kind mass outside the R15 menu. Target rows: per option the distance, how many options the clamp holds at 0, and the position of the act in progress on the target menu (-1: not on it). */
  excludedKindMass?: number; dist?: number[]; clamped?: number; carryTarget?: number;
  /** Rules worlds: the rules' realised kind on this menu, and where it applies the realised target and whether the teacher's arithmetic with the realised jitter gives it. */
  realised?: { kindIndex: number; targetIndex: number | null; targetArgmax: boolean | null };
}
export type R16Row = R15Row & { r16: R16Meta };
export interface LabelOutcome { rows: R16Row[]; exclusions: string[]; detail: R15LabelDetail; clampTied: boolean }

/** P1: the nest-mates the rules count for an animal in its own finished nest (src/sim/candidates.ts nestCompanyValue), and those the packet does not list. */
export function companyOf(w: World, c: Chimp, request: Pick<KernelRequest, 'context'>): { counted: number; unseen: number } | null {
  if (!inNest(c)) return null;
  const P = paramsOf(w), asleepOnly = P.choiceBelief === 1 || (P.choiceBelief === 2 && dayPhase(w) === 'day'), l2 = P.partyLinkM * P.partyLinkM;
  const listed = new Set(request.context.social.map(s => s.id));
  let counted = 0, unseen = 0;
  for (const o of index(w).alive) {
    if (o === c || o.troopId !== c.troopId || o.age < 12 || o.action !== 'nest') continue;
    if (asleepOnly && ix(o).asl !== 1) continue;
    const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2];
    if (dx * dx + dz * dz > l2) continue;
    counted++; if (!listed.has(o.id)) unseen++;
  }
  return { counted, unseen };
}
const distOf = (k: Candidate): number => k.about?.distM ?? k.value?.distM ?? 0;

/**
 * The two teachers at one decision (live world), with stage R16's options: the target group the selection named, the
 * halves, and the clamp rule. `live`: at a rules decision, the option the rules then took (for the realised-pick checks).
 */
export function labelAt(w: World, c: Chimp, request: KernelRequest, sel: Pick<Selected, 'id' | 'source' | 'via' | 'day' | 'tick' | 'words' | 'kind' | 'targets' | 'target'>, live?: { chosen: Candidate; rngBefore: number }): LabelOutcome {
  const rng = w.rng, version = c.decisionVersion;
  const got = r15TrainingRows(w, c, request, sel.id, { target: sel.target, halves: true, clampRule: true, ...(live ? { realised: live } : {}) });
  const kinds = request.context.resourceKinds ?? [], list = computeCandidates(w, c, []);
  const cur = list.find(k => k.action === c.action && k.targetId === c.targetId), curKind = cur ? optionKind(cur) : null;
  const carry = { kind: curKind, finished: ix(c).finished, index: curKind ? kinds.indexOf(curKind) : -1 };
  const company = companyOf(w, c, request), base = { source: sel.source, via: sel.via, day: sel.day, tick: sel.tick, stratum: sel.kind, targets: sel.targets.map(t => t.stratum), words: sel.words, cell: cellOf(sel.words, curKind ?? 'none'), carry, company };
  let realised: R16Meta['realised'];
  if (live) {
    const k = optionKind(live.chosen), kindIndex = kinds.indexOf(k), t = got.detail.target;
    let targetIndex: number | null = null, targetArgmax: boolean | null = null;
    if (t && t.kind === k) {
      targetIndex = t.request.options.findIndex(o => optionKey(o) === optionKey(live.chosen));
      if (targetIndex >= 0 && t.values.every(v => !v.belief)) {
        const s = t.request.options.map(o => { const m = candidateMeta.get(o); return m?.raw === undefined || m.jit === undefined ? NaN : published(m.raw + m.jit); });
        const top = Math.max(...s);
        targetArgmax = s.every(Number.isFinite) ? Math.abs(s[targetIndex] - top) < 1e-9 : null;
      }
    }
    realised = { kindIndex, targetIndex, targetArgmax };
  }
  const rows: R16Row[] = got.rows.map(r => {
    if (r.phase === 'kind') {
      const h = got.detail.kind?.halves ?? null;
      return { ...r, r16: { ...base, halves: h && h[0].length && h[1].length ? h : null, excludedKindMass: r.diagnostics.excludedKindMass, ...(realised ? { realised } : {}) } };
    }
    const t = got.detail.target!, half = t.halves ? [normalize(t.halves[0]), normalize(t.halves[1])] as [number[], number[]] : null;
    return { ...r, r16: { ...base, halves: half, dist: t.request.options.map(distOf), clamped: t.clamped, carryTarget: t.request.options.findIndex(o => o.action === c.action && o.targetId === c.targetId), ...(realised ? { realised } : {}) } };
  });
  if (w.rng !== rng || c.decisionVersion !== version) throw new Error('labelling changed the world\'s random state or the decision version');
  return { rows, exclusions: got.exclusions, detail: got.detail, clampTied: !!got.detail.target?.clampTied };
}

// ---------------------------------------------------------------------------------------------------------------------
// Rules worlds: the census and the label pass, one simulated day at a time (§5.1)
// ---------------------------------------------------------------------------------------------------------------------

export const dayName = (d: number): string => `d${String(d).padStart(3, '0')}`;
const lines = <T>(file: string): T[] => existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as T) : [];
export const readJsonl = lines;
function writeNewAtomic(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}
export interface CensusDay { day: number; hash: string; entries: number; adults: number; seconds: number }
export interface CensusFile {
  stage: 'R16'; tool: 'r16-census'; seed: number; source: 'rules'; params: string; paramsSha256: string; switches: Record<string, number>; commit: string;
  burnInDays: number; daysAsked: number; burnInHash: string; days: CensusDay[];
}
/**
 * The census of a rules world: from the burn-in (written once as ckpt/start.json.gz) through `days` window days, a census
 * file and a checkpoint per day. Resumes after the last whole day on file. Returns the day hashes.
 */
export function rulesCensus(out: string, seed: number, o: { days?: number; burnInDays?: number; commit: string; log?: (s: string) => void }): CensusFile {
  const days = o.days ?? R16.days, burnInDays = o.burnInDays ?? R16.burnInDays, file = resolve(out, 'census.json'), log = o.log ?? (() => {});
  let doc: CensusFile;
  let e: { world: World; day: number; meter: Record<string, never> };
  if (existsSync(file)) {
    doc = JSON.parse(readFileSync(file, 'utf8')) as CensusFile;
    if (doc.seed !== seed || doc.daysAsked !== days || doc.burnInDays !== burnInDays || doc.paramsSha256 !== paramsSha()) throw new Error(`${file} is another census`);
    const last = doc.days.length, ck = last ? resolve(out, 'ckpt', `${dayName(last)}.json.gz`) : resolve(out, 'ckpt', 'start.json.gz');
    const r = readCkpt(ck);
    e = { world: r.world, day: last, meter: {} };
  } else {
    const t0 = Date.now(), w = burnIn(seed, true, burnInDays);
    e = { world: w, day: 0, meter: {} };
    writeCkpt(resolve(out, 'ckpt', 'start.json.gz'), e as never);
    doc = { stage: 'R16', tool: 'r16-census', seed, source: 'rules', params: R16.paramsFile, paramsSha256: paramsSha(), switches: { ...LOOP_SWITCHES, ...R15_SWITCHES }, commit: o.commit, burnInDays, daysAsked: days, burnInHash: worldHash(w), days: [] };
    writeAtomic(file, JSON.stringify(doc, null, 1) + '\n');
    log(`seed ${seed}: burn-in of ${burnInDays} days in ${Math.round((Date.now() - t0) / 1000)} s, hash ${doc.burnInHash}`);
  }
  const w = e.world, P = paramsOf(w);
  for (let d = e.day + 1; d <= days; d++) {
    const t0 = Date.now(), entries: CensusEntry[] = [];
    const untap = tapRulesDecisions(w, { minAge: P.rgMinAge, want: () => true, onDecision: p => {
      if (p.why === 'kept' || p.why === 'arrived' || p.req.options.length < 2 || p.req.context.resourceChoice !== 'kind') return;
      entries.push(censusEntry(seed, 'rules', p.tick, windowDay(w, burnInDays), p.c.id, p.req.context.version, p.req));
    } });
    try { for (let k = 0; k < DAY; k++) tickWorld(w); } finally { untap(); }
    e.day = d;
    writeNewAtomic(resolve(out, 'census', `${dayName(d)}.jsonl`), entries.map(x => JSON.stringify(x)).join('\n') + (entries.length ? '\n' : ''));
    const ck = writeCkpt(resolve(out, 'ckpt', `${dayName(d)}.json.gz`), e as never);
    doc.days.push({ day: d, hash: ck.hash, entries: entries.length, adults: w.chimps.filter(c => c.alive && c.age >= P.rgMinAge).length, seconds: Math.round((Date.now() - t0) / 1000) });
    writeAtomic(file, JSON.stringify(doc, null, 1) + '\n');
    log(`seed ${seed}: census day ${d}/${days}: ${entries.length} fresh decisions, hash ${ck.hash}, ${doc.days[doc.days.length - 1].seconds} s`);
  }
  return doc;
}
export function readCensus(out: string): { doc: CensusFile; entries: CensusEntry[] } {
  const doc = JSON.parse(readFileSync(resolve(out, 'census.json'), 'utf8')) as CensusFile;
  if (doc.days.length !== doc.daysAsked) throw new Error(`${out}: the census has ${doc.days.length} of ${doc.daysAsked} days`);
  return { doc, entries: doc.days.flatMap(d => lines<CensusEntry>(resolve(out, 'census', `${dayName(d.day)}.jsonl`))) };
}

export interface LabelDayMeta {
  stage: 'R16'; tool: 'r16-labels'; seed: number; day: number; hash: string; censusHash: string; selected: number; labelled: number; rows: number;
  exclusions: Record<string, number>; clampTied: Record<string, number>; seconds: number; rngAndVersionUnchanged: boolean;
  /** R11's marks at every labelled rules decision (the flat label under the kind marginal): the replay of the rules' belief draws ends on the world's random state, the first maximum is the rules' pick, the menu rebuilt at the true version is the rules' own. */
  m1: { rngOk: number; pickOk: number; listOk: number; of: number };
}
/**
 * The label pass of one window day of a rules world: from the census checkpoint of the day before, the day is run again
 * with the teachers at the selected decisions; it must land on the census's hash of that day. A day whose label file is
 * on file is not run again.
 */
export function labelRulesDay(out: string, seed: number, day: number, selected: Map<string, Selected>, o: { burnInDays?: number; log?: (s: string) => void } = {}): LabelDayMeta {
  const burnInDays = o.burnInDays ?? R16.burnInDays, dest = resolve(out, 'labels', `${dayName(day)}.jsonl`), metaFile = `${dest}.meta.json`;
  if (existsSync(metaFile) && existsSync(dest)) return JSON.parse(readFileSync(metaFile, 'utf8')) as LabelDayMeta;
  const census = JSON.parse(readFileSync(resolve(out, 'census.json'), 'utf8')) as CensusFile, cday = census.days.find(d => d.day === day);
  if (!cday) throw new Error(`no census of day ${day} at ${out}`);
  const r = readCkpt(resolve(out, 'ckpt', day === 1 ? 'start.json.gz' : `${dayName(day - 1)}.json.gz`)), w = r.world, P = paramsOf(w), t0 = Date.now();
  const rows: R16Row[] = [], exclusions: Record<string, number> = {}, clamp: Record<string, number> = {}, m1 = { rngOk: 0, pickOk: 0, listOk: 0, of: 0 };
  let labelled = 0, want = 0;
  for (const s of selected.values()) if (s.day === day) want++;
  const untap = tapRulesDecisions(w, { minAge: P.rgMinAge, want: c => selected.has(censusId('rules', seed, w.tick, c.id, c.decisionVersion)), onDecision: p => {
    const id = censusId('rules', seed, p.tick, p.c.id, p.req.context.version), sel = selected.get(id);
    if (!sel || p.why === 'kept' || p.why === 'arrived') return;
    labelled++;
    const got = labelAt(w, p.c, p.req, sel, { chosen: p.chosen, rngBefore: p.rng });
    rows.push(...got.rows);
    for (const x of got.exclusions) { const k = `${sel.split}:${sel.via}:${x}`; exclusions[k] = (exclusions[k] ?? 0) + 1; }
    if (got.clampTied) { const k = `${sel.words.light}${sel.words.trend ? ',' + sel.words.trend : ''}:${got.detail.target?.kind}:${sel.via}:${sel.split}`; clamp[k] = (clamp[k] ?? 0) + 1; }
    const lab = got.detail.kind?.label;
    if (lab) { m1.of++; if (lab.rngOk) m1.rngOk++; if (lab.pickOk) m1.pickOk++; if (lab.listOk) m1.listOk++; }
  } });
  try { for (let k = 0; k < DAY; k++) tickWorld(w); } finally { untap(); }
  const hash = worldHash(w);
  if (hash !== cday.hash) throw new Error(`label pass of day ${day} of seed ${seed} ended on ${hash}; the census day ended on ${cday.hash}`);
  if (labelled !== want) throw new Error(`label pass of day ${day} of seed ${seed} met ${labelled} of ${want} selected decisions`);
  writeNewAtomic(dest, rows.map(x => JSON.stringify(x)).join('\n') + (rows.length ? '\n' : ''));
  const meta: LabelDayMeta = { stage: 'R16', tool: 'r16-labels', seed, day, hash, censusHash: cday.hash, selected: want, labelled, rows: rows.length, exclusions, clampTied: clamp, seconds: Math.round((Date.now() - t0) / 1000), rngAndVersionUnchanged: true, m1 };
  writeNewAtomic(metaFile, JSON.stringify(meta, null, 1) + '\n');
  o.log?.(`seed ${seed}: labels of day ${day}: ${labelled} decisions, ${rows.length} rows, hash ${hash} equal to the census, ${meta.seconds} s`);
  return meta;
}
/** Every label file of a collection folder, in day order. */
export function readLabels(out: string): R16Row[] {
  const dir = resolve(out, 'labels');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => /^d\d+\.jsonl$/.test(f)).sort().flatMap(f => lines<R16Row>(resolve(dir, f)));
}
/** The selection file of a collection folder (written once by the CLI, read by every label segment). */
export function readSelection(out: string): Selected[] { return lines<Selected>(resolve(out, 'selection.jsonl')); }
export const selectionDigest = (s: Selected[]): string => digest(s.map(x => [x.id, x.via]));
