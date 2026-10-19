// The Endor training test (docs/staging/endor-train.md §2): the exporter. It reads exactly stage R16's round-zero
// training and development files, checks them and the manifest and token files by sha256, re-checks every row with
// R16's own reader (`rowRefusal`: the packet re-rendered from its context byte for byte through R15's check, the split
// by animal, the seed), keeps seeds 48 and 7 only and drops every packet over 512 tokens by our count. It has no network
// code: nothing is sent from here. Without --write it prints what it would export and writes nothing; with --write it
// writes the local export the trainer reads (train.jsonl and dev.jsonl in train_r11's row format, export.json with the
// counts and the sha256 of every packet that may leave). The bodies themselves are built by
// training/decide_ft/endor_wire.py from these rows only.
//
//   pnpm exec tsx scripts/endor-export.ts [--write] [--out artifacts/endor/export]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rowRefusal } from './lib/r16-assemble';
import type { R16Row } from './lib/r16-collect';

const FT0 = '/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-r16/artifacts/r16/ft0';
/** The only files this exporter opens, with their registered sha256 (docs/staging/endor-train.md §2). */
export const INPUTS = {
  train: { path: `${FT0}/contexts/train.jsonl`, sha256: '4175e6bd4ccd395ec08479bb59fe12c0b88c0fdb39abdd5055dc6c9d04fadb80' },
  dev: { path: `${FT0}/contexts/dev.jsonl`, sha256: '1ecd363048aa47ab24f919fe25d054cb12bbcbc1685b10d1d8f9f3715564fa79' },
  manifest: { path: `${FT0}/contexts/manifest.json`, sha256: '48344b7665bd3b2e50e384f052c2632f85833c002008c6b16a3f97c38774510e' },
  tokens: { path: `${FT0}/preflight-failed-20261018-1141/tokens.json`, sha256: '9cab90002cc7d0a3ac409b1454f31473b4b16a6e3cc68e768218f1019e757d36' },
} as const;
export const MAX_TOKENS = 512;   // Endor's gliner2.5-decide window per question (its base-model page)
export const MAX_OPTIONS = 64;   // Endor's gliner2.5-decide option limit
export const SEEDS = [48, 7];    // allowlist: the rules worlds R16 trains and develops on
/** The packet's state lines R15's packet writes (allowlist; anything else stops the export). */
export const STATE_KEYS = ['me', 'feeling', 'doing', 'body', 'now', 'nearby', 'lately', 'last', 'memories', 'asked because', 'events', 'chosen activity'];

export const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');

/** The export row: what the trainer needs and nothing else (the context, the r16 record and diagnostics stay behind). */
export interface ExportRow { id: string; seed: number; phase: 'kind' | 'target'; tokens: number; packet: { state: Record<string, unknown>; questions: { action: { type: 'choice'; instructions: string; criteria: Record<string, string> } } }; pick: string; soft: Record<string, number> }

/** Why the packet's shape is not what Endor is sent, or ''. The packet must be R15's: a state of known lines holding
 *  text or lists of text, one choice question named `action` with a fixed sentence and 2 to 64 text options. */
export function shapeRefusal(packet: unknown): string {
  const p = packet as Record<string, unknown> | null;
  if (!p || typeof p !== 'object' || JSON.stringify(Object.keys(p)) !== '["state","questions"]') return 'the packet is not {state, questions}';
  const state = p.state as Record<string, unknown>, questions = p.questions as Record<string, unknown>;
  if (!state || typeof state !== 'object' || Array.isArray(state)) return 'the state is not an object';
  for (const [k, v] of Object.entries(state)) {
    if (!STATE_KEYS.includes(k)) return `a state line not on the allowlist: ${k}`;
    if (!(typeof v === 'string' || (Array.isArray(v) && v.every(x => typeof x === 'string')))) return `the state line ${k} is not text`;
  }
  if (!questions || JSON.stringify(Object.keys(questions)) !== '["action"]') return 'the questions are not {action}';
  const q = questions.action as Record<string, unknown>;
  if (!q || JSON.stringify(Object.keys(q)) !== '["type","instructions","criteria"]' || q.type !== 'choice' || typeof q.instructions !== 'string') return 'the action question is not {type: choice, instructions, criteria}';
  const criteria = q.criteria as Record<string, unknown>;
  const keys = criteria && typeof criteria === 'object' ? Object.keys(criteria) : [];
  if (keys.length < 2 || keys.length > MAX_OPTIONS || keys.some((k, i) => k !== `c${i}`) || Object.values(criteria).some(v => typeof v !== 'string')) return 'the options are not c0..cN with text';
  return '';
}

/** Why a label is not a soft label over exactly the options (order and sum), or ''. */
export function labelRefusal(row: { packet: ExportRow['packet']; soft: unknown; pick: unknown }): string {
  const keys = Object.keys(row.packet.questions.action.criteria), soft = row.soft as Record<string, unknown>;
  if (!soft || JSON.stringify(Object.keys(soft)) !== JSON.stringify(keys)) return 'the label does not name exactly the options in order';
  const v = keys.map(k => soft[k]);
  if (!v.every((x): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0)) return 'a label mass is not a number at or above 0';
  if (Math.abs(v.reduce((a, b) => a + b, 0) - 1) > 1e-6) return 'the label does not sum to 1';
  if (typeof row.pick !== 'string' || !keys.includes(row.pick)) return 'the pick is not an option';
  return '';
}

/** Our real token count of each row of a split: the larger of its original and permuted packets (R16's preflight). */
export function tokenCounts(tokensFile: { rows: { id: string; split: string; tokens: number }[] }, split: 'train' | 'dev'): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of tokensFile.rows) if (r.split === split) out.set(r.id, Math.max(out.get(r.id) ?? 0, r.tokens));
  return out;
}

export interface Outcome { kept: ExportRow[]; dropped: Record<string, number>; counts: Record<string, number>; droppedBy: Record<string, number> }

/** The export of one file's rows. `check` is R16's reader (injected so the filter can be tested on small rows). */
export function exportRows(rows: unknown[], role: 'train' | 'dev', tokens: Map<string, number>, source: string, check: (row: R16Row, role: 'train' | 'dev', source: string) => string = rowRefusal): Outcome {
  const kept: ExportRow[] = [], dropped: Record<string, number> = {}, counts: Record<string, number> = {}, droppedBy: Record<string, number> = {}, seen = new Set<string>();
  const stop = (why: string, id: unknown) => { throw new Error(`export refused (${role}, ${String(id)}): ${why}`); };
  for (const raw of rows) {
    const row = raw as R16Row;
    // Allowlist: a row that is not a training or development row of 48 or 7, in its own split, stops the export.
    if (!SEEDS.includes(row?.seed)) stop(`seed ${row?.seed} is not on the allowlist (48, 7)`, row?.id);
    const why = check(row, role, source);
    if (why) stop(why, row.id);
    if (row.split !== role) stop(`a ${row.split} row in the ${role} file`, row.id);
    if (seen.has(row.id)) stop('an id twice', row.id);
    seen.add(row.id);
    const shape = shapeRefusal(row.packet) || labelRefusal(row as unknown as ExportRow);
    if (shape) stop(shape, row.id);
    const n = tokens.get(row.id), cell = `${row.seed}:${row.phase}`;
    if (n === undefined) stop('no token count', row.id);
    if (n! > MAX_TOKENS) { dropped[cell] = (dropped[cell] ?? 0) + 1; droppedBy[`over ${MAX_TOKENS} tokens`] = (droppedBy[`over ${MAX_TOKENS} tokens`] ?? 0) + 1; continue; }
    counts[cell] = (counts[cell] ?? 0) + 1;
    kept.push({ id: row.id, seed: row.seed, phase: row.phase as 'kind' | 'target', tokens: n!, packet: row.packet as unknown as ExportRow['packet'], pick: row.pick, soft: row.soft as Record<string, number> });
  }
  return { kept, dropped, counts, droppedBy };
}

/** Each input file read only after its sha256 matches the registered one; the manifest must name the same hashes. */
export function readInputs(inputs = INPUTS): { train: unknown[]; dev: unknown[]; tokens: { rows: { id: string; split: string; tokens: number }[] } } {
  const bytes: Record<string, Buffer> = {};
  for (const [name, f] of Object.entries(inputs)) {
    const b = readFileSync(f.path);
    if (sha256(b) !== f.sha256) throw new Error(`export refused: ${name} does not have its registered sha256`);
    bytes[name] = b;
  }
  const manifest = JSON.parse(bytes.manifest.toString('utf8'));
  if (manifest.stage !== 'R16' || manifest.round !== 'zero' || manifest.outputs?.[inputs.train.path] !== inputs.train.sha256 || manifest.outputs?.[inputs.dev.path] !== inputs.dev.sha256) throw new Error('export refused: the manifest does not name the two files by these hashes');
  const lines = (b: Buffer) => b.toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as unknown);
  return { train: lines(bytes.train), dev: lines(bytes.dev), tokens: JSON.parse(bytes.tokens.toString('utf8')) };
}

const jsonl = (rows: object[]) => rows.map(r => JSON.stringify(r)).join('\n') + '\n';
function writeOnce(file: string, text: string): void {
  // An export that exists is kept: the same bytes again pass, other bytes refuse (a stale export is inspected, not overwritten).
  if (existsSync(file)) { if (readFileSync(file, 'utf8') !== text) throw new Error(`export refused: ${file} exists with other content`); return; }
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, text, { flag: 'wx' });
  renameSync(tmp, file);
}

export function main(argv: string[]): void {
  const write = argv.includes('--write'), at = argv.indexOf('--out');
  const out = resolve(at >= 0 ? argv[at + 1] : 'artifacts/endor/export');
  const input = readInputs();
  const train = exportRows(input.train, 'train', tokenCounts(input.tokens, 'train'), INPUTS.train.path);
  const dev = exportRows(input.dev, 'dev', tokenCounts(input.tokens, 'dev'), INPUTS.dev.path);
  const packetSha = (rows: ExportRow[]) => rows.map(r => ({ phase: r.phase, tokens: r.tokens, packetSha256: sha256(JSON.stringify(r.packet)) }));
  const files = { train: jsonl(train.kept), dev: jsonl(dev.kept) };
  const summary = {
    schema: 'endor-export-1', name_of_results: 'rules-taught model on the R15 menu, trained on Endor (gliner2.5-decide, LoRA)',
    inputs: Object.fromEntries(Object.entries(INPUTS).map(([k, f]) => [k, f.sha256])),
    filter: { maxTokens: MAX_TOKENS, count: "ours (R16's preflight of 18 October, the larger of the original and permuted packets)", seeds: SEEDS },
    rows: { train: { read: input.train.length, kept: train.kept.length, keptBy: train.counts, droppedBy: train.dropped }, dev: { read: input.dev.length, kept: dev.kept.length, keptBy: dev.counts, droppedBy: dev.dropped } },
    outputs: { 'train.jsonl': sha256(files.train), 'dev.jsonl': sha256(files.dev) },
    // the local list of what may leave: one line per packet, by the sha256 of the packet (no id, no seed)
    packets: { train: packetSha(train.kept), dev: packetSha(dev.kept) },
  };
  const short = { ...summary, packets: { train: summary.packets.train.length, dev: summary.packets.dev.length } };
  console.log(JSON.stringify(short, null, 1));
  if (!write) { console.log(`dry: nothing written (pass --write to write ${out})`); return; }
  writeOnce(resolve(out, 'train.jsonl'), files.train);
  writeOnce(resolve(out, 'dev.jsonl'), files.dev);
  writeOnce(resolve(out, 'export.json'), JSON.stringify(summary, null, 1) + '\n');
  console.log(`written: ${out} (train.jsonl ${summary.outputs['train.jsonl']}, dev.jsonl ${summary.outputs['dev.jsonl']})`);
}

if (process.argv[1]?.endsWith('endor-export.ts')) {
  try { main(process.argv.slice(2)); } catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exit(2); }
}
