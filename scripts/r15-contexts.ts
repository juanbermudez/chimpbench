// Explicit bounded collection and assembly; no model is loaded by this script.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { record, validateDecisionContext } from '../src/sim/context-check';
import { splitOf } from './r4-contexts';
import { sampleR8 } from './r8-contexts';
import { digest, normalize, r15Packet, r15TrainingRows, R15_KIND_TEACHER, R15_PACKET_VERSION, R15_TARGET_TEACHER } from './lib/r15-training';

const hashFile = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const git = () => execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const paramsFile = 'docs/staging/integrator-kit/params/M6-W50.json';
export function shellQuote(value: string): string { return "'" + value.replaceAll("'", "'\\''") + "'"; }
export function requireCleanSource(): void {
  if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) throw new Error('R15 CLI requires a clean committed source checkout');
}
function writeNew(path: string, value: string): void { mkdirSync(resolve(path, '..'), { recursive: true }); writeFileSync(path, value, { flag: 'wx' }); }
function idleForCollection(): void {
  const root = '/Volumes/Drive/chimpbench/MGOGO';
  const state = `${root}/.claude/worktrees/bench-r14/artifacts/r14/state`;
  if (existsSync(`${root}/artifacts/r14-chain.lock`) || (existsSync(state) && readFileSync(state, 'utf8').trim() === 'running')) throw new Error('R14 is active; do not start teacher collection alongside it');
}
export function assembleR15(parts: string[], out: string): void {
  if (!parts.length) throw new Error('provide one or more parts');
  const seen = new Set<string>(), grouped = { train: [] as object[], dev: [] as object[], test: [] as object[] };
  const inputs: Record<string, string> = {}, sourceCommit = git(), paramsHash = hashFile(paramsFile);
  const phaseCounts = { train: { kind: 0, target: 0 }, dev: { kind: 0, target: 0 }, test: { kind: 0, target: 0 } };
  for (const part of parts) {
    const metaPath = part + '.meta.json', meta = json(metaPath), lines = readFileSync(part, 'utf8').split('\n').filter(Boolean);
    if (!record(meta) || meta.stage !== 'R15' || meta.packetVersion !== R15_PACKET_VERSION || meta.commit !== sourceCommit || meta.paramsHash !== paramsHash
      || meta.output !== hashFile(part) || meta.rows !== lines.length || ![48, 7, 21].includes(Number(meta.seed))) throw new Error('invalid R15 collection provenance');
    inputs[resolve(part)] = hashFile(part); inputs[resolve(metaPath)] = hashFile(metaPath);
    for (const line of lines) {
    const row: unknown = JSON.parse(line);
    if (!record(row) || row.seed !== meta.seed || typeof row.id !== 'string' || typeof row.decisionId !== 'string' || ![48, 7, 21].includes(Number(row.seed)) || typeof row.seed !== 'number' || typeof row.chimpId !== 'number'
      || row.packetVersion !== R15_PACKET_VERSION || !validateDecisionContext(row.context) || row.context.chimpId !== row.chimpId || row.phase !== row.context.resourceChoice || row.contextHash !== digest(row.context)
      || row.packetHash !== digest(row.packet) || JSON.stringify(row.packet) !== JSON.stringify(r15Packet(row.context)) || !record(row.soft) || typeof row.pick !== 'string'
      || row.teacher !== (row.phase === 'kind' ? R15_KIND_TEACHER : R15_TARGET_TEACHER)) throw new Error('invalid R15 row or packet parity');
    const split = splitOf(row.seed, row.chimpId);
    if (row.split !== split || seen.has(row.id) || row.id !== `${row.decisionId}/${row.phase}`) throw new Error('duplicate row, identity mismatch or split leak');
    const aliases = Object.keys(r15Packet(row.context).questions.action.criteria), soft = row.soft;
    const values = aliases.map(k => soft[k]);
    if (Object.keys(soft).length !== aliases.length || !values.every((v): v is number => typeof v === 'number') || !aliases.includes(row.pick)) throw new Error('label aliases differ');
    const normalized = normalize(values);
    if (values.some((v, i) => Math.abs(v - normalized[i]) > 1e-8)) throw new Error('label is not normalized');
    if (row.phase !== 'kind' && row.phase !== 'target') throw new Error('invalid phase');
    seen.add(row.id); grouped[split].push(row); phaseCounts[split][row.phase]++;
    }
  }
  const files = ['train', 'dev', 'test'].map(s => resolve(out, 'contexts', `${s}.jsonl`));
  if (files.some(existsSync) || existsSync(resolve(out, 'contexts/manifest.json'))) throw new Error('refuse overwrite of R15 dataset');
  for (const split of ['train', 'dev', 'test'] as const) writeNew(resolve(out, 'contexts', `${split}.jsonl`), grouped[split].map(r => JSON.stringify(r)).join('\n') + (grouped[split].length ? '\n' : ''));
  const manifest = { stage: 'R15', packetVersion: R15_PACKET_VERSION, kindTeacher: R15_KIND_TEACHER, targetTeacher: R15_TARGET_TEACHER, labels: 'soft',
    name_of_results: 'rules-scaffold activity and perceived-resource target imitation', input: 'two explicit resource-targets-v1 phases',
    sampling: 'one kind row and at most one hash-selected multi-target resource row per fresh decision', inputs, commit: sourceCommit, paramsHash, phaseCounts,
    counts: Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length])),
    outputs: Object.fromEntries(files.map(f => [f, hashFile(f)])), limits: 'not wild preference labels, ecological reward, recurrence inside neural weights, or population viability' };
  writeNew(resolve(out, 'contexts/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeNew(resolve(out, 'train-command.txt'), `python3 -B training/decide_ft/train_r15.py --root ${shellQuote(resolve(out))} --seed 7\n# After tokenizer/parity and review, append --run; refuses while R14 is active.\n`);
}
if (process.argv[1]?.endsWith('r15-contexts.ts')) {
  requireCleanSource();
  const args = process.argv.slice(2), mode = args[0];
  const arg = (name: string, fallback: string) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
  if (mode === 'assemble') assembleR15(arg('parts', '').split(',').filter(Boolean), resolve(arg('out', 'artifacts/decide-ft/r15')));
  else if (mode === 'sample') {
    const seed = Number(arg('seed', '48')), ticks = Number(arg('ticks', '1400')), limit = Number(arg('limit', '16'));
    if (![48, 7].includes(seed) || !Number.isInteger(ticks) || ticks < 1 || ticks > 1400 || !Number.isInteger(limit) || limit < 1 || limit > 64) throw new Error('sample: seeds48/7, ticks1..1400, limit1..64');
    idleForCollection();
    const raw = json('docs/staging/integrator-kit/params/M6-W50.json');
    if (!record(raw) || !Object.values(raw).every(v => typeof v === 'number' && Number.isFinite(v))) throw new Error('invalid parameter file');
    const params: Record<string, number> = {};
    for (const [key, value] of Object.entries(raw)) if (typeof value === 'number') params[key] = value;
    const rows: object[] = [], exclusions: Record<string, number> = {}; let selected = 0;
    const started = Date.now(), maxSeconds = 1800;
    const result = sampleR8({ onTick() { if ((Date.now() - started) / 1000 > maxSeconds) throw new Error('R15 collection exceeded 30-minute wall budget'); }, seed, base: 'W50', params: { ...params, resourceTargets: 1, activityFirst: 2, observeV5: 1, menuParity: 1 }, burnIn: 30, days: ticks / 5760, p: .02, tag: 'r15',
      capture(rec, live) {
        if (rec.label !== 'fresh' || selected >= limit) return;
        selected++;
        const labelled = r15TrainingRows(live.w, live.c, rec.request, `r15:${rec.id}`);
        rows.push(...labelled.rows);
        for (const reason of labelled.exclusions) exclusions[reason] = (exclusions[reason] ?? 0) + 1;
      } });
    const out = resolve(arg('out', `artifacts/decide-ft/r15/parts/s${seed}.jsonl`));
    writeNew(out, rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
    writeNew(out + '.meta.json', JSON.stringify({ stage: 'R15', packetVersion: R15_PACKET_VERSION, seed, burnInDays: 30, burnInTicks: 172800, samplingTicks: ticks, maxSeconds, limit, selected, exclusions,
      rows: rows.length, worldHashWithoutOwn: result.hash, commit: git(), paramsHash: hashFile('docs/staging/integrator-kit/params/M6-W50.json'), output: hashFile(out), costSeconds: result.seconds }, null, 2) + '\n');
    console.log(JSON.stringify({ out, selected, rows: rows.length, exclusions }));
  } else throw new Error('r15-contexts.ts sample --seed 48|7 --ticks 1400 --limit 16 [--out part.jsonl] | assemble --parts file,file --out FTROOT');
}
