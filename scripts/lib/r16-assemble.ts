// Stage R16 (docs/staging/r16-prereg.md §4.5, §8, §10): the training files of the two rounds and the reading sets, with
// their leak checks. Every row is checked against the R15 contract by stage R15's own check (scripts/r15-contexts.ts
// checkRow: the packet re-rendered from its context byte for byte, the hashes, the teacher, the split by animal, a
// normalized label), and then against this stage's roles: training and development rows come only from 48 and 7 and from
// their own animals' split, seed 21 only as `test` in the held-out rules set, never a seed-3613 row or anything of R14's
// seed-21 run, no animal in two splits, no id twice, no clamp-tied target row in a training file. Round one's rows carry
// the epochs that show them (equal exposure, §8), chosen by a hash of their id before any training.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { checkR15Row } from '../r15-contexts';
import { R15_KIND_TEACHER, R15_PACKET_VERSION, R15_TARGET_TEACHER } from './r15-training';
import { readJsonl, type R16Row } from './r16-collect';

export const sha256File = (f: string): string => createHash('sha256').update(readFileSync(f)).digest('hex');
/** A file's hash, or for a folder the hash of its files' names and hashes in order (a collection's label segments). */
export function inputHash(path: string): string {
  if (!existsSync(path)) return 'in memory';
  if (!statSync(path).isDirectory()) return sha256File(path);
  return createHash('sha256').update(JSON.stringify(readdirSync(path).sort().filter(f => statSync(resolve(path, f)).isFile()).map(f => [f, sha256File(resolve(path, f))]))).digest('hex');
}
const writeNew = (file: string, text: string): void => { mkdirSync(dirname(file), { recursive: true }); const tmp = `${file}.tmp-${process.pid}`; writeFileSync(tmp, text, { flag: 'wx' }); renameSync(tmp, file); };
const jsonl = (rows: object[]): string => rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : '');

/** Why a row may not stand where it is put, or ''. `role`: a training or development file, or a reading set. Pure but for checkR15Row. */
export function rowRefusal(row: R16Row, role: 'train' | 'dev' | 'hr' | 'hs' | 'hl', source: string): string {
  try { checkR15Row(row, row.seed); } catch (error) { return error instanceof Error ? error.message : String(error); }
  if (!row.r16) return 'a row without its stage R16 record';
  if (/learner-s21|\/s21\//.test(source) && row.r16.source !== 'rules') return 'R14\'s partial seed-21 run is never read';
  if (row.seed === 3613) return 'seed 3613 gives no row';
  if (role === 'train' || role === 'dev') {
    if (![48, 7].includes(row.seed)) return `a ${role} row from seed ${row.seed}: only 48 and 7 train and develop`;
    if (row.split !== role) return `a ${row.split} animal's row in the ${role} file`;
    if (row.r16.source === 'sibling') return 'R14\'s relabelled states are evaluation only';
    if (row.phase === 'target' && row.r16.clamped !== undefined && row.r16.clamped >= (row.context.candidates?.length ?? 0) && (row.context.candidates?.length ?? 0) > 0) return 'a clamp-tied target row';
  }
  if (role === 'hr' && (row.seed !== 21 || row.split !== 'test' || row.r16.source !== 'rules')) return 'the held-out rules set is seed 21, rules, test only';
  if ((role === 'hs' || role === 'hl') && (![48, 7].includes(row.seed) || row.split !== 'dev')) return 'the in-sample learner sets hold development animals of 48 and 7 only';
  if (role === 'hs' && row.r16.source !== 'sibling') return 'H-S holds R14\'s relabelled states only';
  if (role === 'hl' && row.r16.source !== 'learner') return 'H-L holds round one\'s own learner states only';
  return '';
}

/** Equal exposure (§8): each row is shown in k of the three epochs, k chosen so that the round shows `target` examples; which rows get the extra showings and which epochs, by a hash of the id. */
export function exposure(ids: string[], target: number, epochs = 3): { epochs: Map<string, number[]>; shown: number; counts: number[] } {
  const n = ids.length;
  if (!n) return { epochs: new Map(), shown: 0, counts: [0, 0, 0, 0] };
  const base = Math.max(1, Math.min(epochs, Math.floor(target / n))), extra = base >= epochs ? 0 : Math.max(0, Math.min(n, target - base * n));
  const h = (id: string) => createHash('sha256').update(`r16-exposure:${id}`).digest('hex');
  const ranked = [...ids].sort((a, b) => h(a).localeCompare(h(b)) || a.localeCompare(b)), more = new Set(ranked.slice(0, extra));
  const out = new Map<string, number[]>(), counts = [0, 0, 0, 0];
  let shown = 0;
  for (const id of ids) {
    const k = base + (more.has(id) ? 1 : 0), e0 = parseInt(h(id).slice(0, 8), 16) % epochs;
    // one showing: epoch e0; two: the two others than e0; three: all
    const list = k === 1 ? [e0] : k === 2 ? [0, 1, 2].filter(e => e !== e0) : [0, 1, 2];
    out.set(id, list); counts[k]++; shown += k;
  }
  return { epochs: out, shown, counts };
}

export interface FtManifest {
  stage: 'R16'; round: 'zero' | 'agg'; packetVersion: typeof R15_PACKET_VERSION; kindTeacher: string; targetTeacher: string; labels: 'soft';
  name_of_results: string; input: string; inputs: Record<string, string>; commit: string; counts: Record<string, number>; phaseCounts: Record<string, { kind: number; target: number }>;
  outputs: Record<string, string>; bySource: Record<string, number>; byVia: Record<string, number>; animals: Record<string, number>; exposure?: unknown; limits: string;
}
const tally = (rows: R16Row[], f: (r: R16Row) => string) => { const t: Record<string, number> = {}; for (const r of rows) t[f(r)] = (t[f(r)] ?? 0) + 1; return t; };

/**
 * Writes a training root (contexts/train.jsonl, dev.jsonl, manifest.json) from labelled rows. Refuses an existing root,
 * any row that may not stand in its file, an id twice, an animal in two splits, and a training or development file
 * without both phases.
 */
export function writeTrainingRoot(out: string, round: 'zero' | 'agg', inputs: { file: string; rows: R16Row[] }[], commit: string, o: { roundZeroTrain?: number } = {}): FtManifest {
  const files = ['train', 'dev'].map(s => resolve(out, 'contexts', `${s}.jsonl`));
  if (files.some(existsSync) || existsSync(resolve(out, 'contexts/manifest.json'))) throw new Error(`refuse to overwrite the training root ${out}`);
  const seen = new Set<string>(), split = new Map<string, string>(), grouped: Record<'train' | 'dev', R16Row[]> = { train: [], dev: [] };
  for (const { file, rows } of inputs) for (const r of rows) {
    if (r.split === 'test') throw new Error(`a test row in a training input (${file})`);
    const role = r.split as 'train' | 'dev', why = rowRefusal(r, role, file);
    if (why) throw new Error(`${r.id} (${file}): ${why}`);
    if (seen.has(r.id)) throw new Error(`the row ${r.id} twice`);
    const animal = `${r.seed}:${r.chimpId}`;
    if (split.has(animal) && split.get(animal) !== role) throw new Error(`animal ${animal} in two splits`);
    seen.add(r.id); split.set(animal, role); grouped[role].push(r);
  }
  const phaseCounts: Record<string, { kind: number; target: number }> = {};
  for (const s of ['train', 'dev'] as const) {
    phaseCounts[s] = { kind: grouped[s].filter(r => r.phase === 'kind').length, target: grouped[s].filter(r => r.phase === 'target').length };
    if (!phaseCounts[s].kind || !phaseCounts[s].target) throw new Error(`the ${s} file needs kind and target rows`);
  }
  let exp: ReturnType<typeof exposure> | null = null;
  if (round === 'agg') {
    if (!o.roundZeroTrain) throw new Error('round one needs round zero\'s training row count (equal exposure)');
    exp = exposure(grouped.train.map(r => r.id), 3 * o.roundZeroTrain);
  }
  const trainRows = exp ? grouped.train.map(r => ({ ...r, epoch: exp!.epochs.get(r.id)! })) : grouped.train;
  const inputHashes = Object.fromEntries(inputs.map(i => [i.file, inputHash(i.file)])); // before any file is written: a failure leaves no partial root
  writeNew(files[0], jsonl(trainRows)); writeNew(files[1], jsonl(grouped.dev));
  const manifest: FtManifest = { stage: 'R16', round, packetVersion: R15_PACKET_VERSION, kindTeacher: R15_KIND_TEACHER, targetTeacher: R15_TARGET_TEACHER, labels: 'soft',
    name_of_results: 'rules-taught model on the R15 menu', input: 'two explicit resource-targets-v1 phases',
    inputs: inputHashes, commit, counts: { train: grouped.train.length, dev: grouped.dev.length },
    phaseCounts, outputs: Object.fromEntries(files.map(f => [f, sha256File(f)])), bySource: tally([...grouped.train, ...grouped.dev], r => `${r.split}:${r.r16.source}`),
    byVia: tally([...grouped.train, ...grouped.dev], r => `${r.split}:${r.r16.source}:${r.r16.via}:${r.phase}`), animals: { train: new Set(grouped.train.map(r => `${r.seed}:${r.chimpId}`)).size, dev: new Set(grouped.dev.map(r => `${r.seed}:${r.chimpId}`)).size },
    ...(exp ? { exposure: { roundZeroTrain: o.roundZeroTrain, target: 3 * o.roundZeroTrain!, rows: grouped.train.length, shown: exp.shown, rowsShownOnce: exp.counts[1], twice: exp.counts[2], thrice: exp.counts[3], perEpoch: [0, 1, 2].map(e => trainRows.filter(r => (r as unknown as { epoch: number[] }).epoch.includes(e)).length) } } : {}),
    limits: 'rules-taught labels on the R15 menu; not wild preference labels, an ecological reward, or population viability' };
  writeNew(resolve(out, 'contexts/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

/** Writes a reading set (held-out rules H-R, sibling H-S, learner H-L) after checking each row's role. */
export function writeReadingSet(file: string, role: 'hr' | 'hs' | 'hl', inputs: { file: string; rows: R16Row[] }[]): { rows: number; animals: number; sha256: string } {
  if (existsSync(file)) throw new Error(`refuse to overwrite ${file}`);
  const seen = new Set<string>(), out: R16Row[] = [];
  for (const { file: f, rows } of inputs) for (const r of rows) {
    const why = rowRefusal(r, role, f);
    if (why) throw new Error(`${r.id} (${f}): ${why}`);
    if (seen.has(r.id)) throw new Error(`the row ${r.id} twice`);
    seen.add(r.id); out.push(r);
  }
  writeNew(file, jsonl(out));
  return { rows: out.length, animals: new Set(out.map(r => `${r.seed}:${r.chimpId}`)).size, sha256: sha256File(file) };
}
export const readRows = (file: string): R16Row[] => readJsonl<R16Row>(file);
