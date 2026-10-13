// Development-only R15 readout. A successful score run is not a model-quality gate.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { R15Worker } from '../server/r15-worker';
import { record, validateDecisionContext } from '../src/sim/context-check';
import { r15Packet } from '../src/providers/packet';
import { hashR15 } from './lib/r15-loop';
import { writeAtomic } from './lib/checkpoint';
import { r15Interruption } from './lib/r15-interrupt';

interface ScoredRow { id: string; phase: 'kind' | 'target'; teacher: number[]; probabilities: number[]; }
interface InputRow extends Omit<ScoredRow, 'probabilities'> { packet: ReturnType<typeof r15Packet>; }
export function summarizeR15Scores(rows: ScoredRow[]) {
  if (!rows.length) throw new Error('no R15 scores');
  return Object.fromEntries((['kind', 'target'] as const).map(phase => {
    const group = rows.filter(r => r.phase === phase);
    if (!group.length) throw new Error(`no ${phase} scores`);
    let crossEntropy = 0, entropy = 0, brier = 0, agreements = 0, uniformCrossEntropy = 0;
    for (const row of group) {
      const q = row.teacher, p = row.probabilities;
      if (q.length !== p.length || q.length < 2 || [q, p].some(a => a.some(v => !Number.isFinite(v) || v < 0 || v > 1) || Math.abs(a.reduce((s, v) => s + v, 0) - 1) > 1e-5)) throw new Error('invalid R15 score distribution');
      crossEntropy -= q.reduce((sum, v, i) => sum + v * Math.log(Math.max(1e-9, p[i])), 0);
      entropy -= q.reduce((sum, v) => sum + (v > 0 ? v * Math.log(v) : 0), 0);
      brier += q.reduce((sum, v, i) => sum + (v - p[i]) ** 2, 0);
      const top = (a: number[]) => a.reduce((best, v, i) => v > a[best] ? i : best, 0);
      agreements += Number(top(q) === top(p)); uniformCrossEntropy += Math.log(q.length);
    }
    const n = group.length;
    return [phase, { n, crossEntropy: crossEntropy / n, teacherEntropy: entropy / n, kl: (crossEntropy - entropy) / n,
      brier: brier / n, topTeacherAgreement: agreements / n, uniformCrossEntropy: uniformCrossEntropy / n }];
  }));
}

export async function main(): Promise<void> {
  const arg = (name: string, fallback = '') => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
  const root = arg('training-root'), output = arg('out');
  if (!root || !output) throw new Error('usage: scripts/r15-evaluate.ts --training-root ROOT --adapter r15-resources-s7 --out NEWDIR');
  if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()
    || execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim() !== 'HEAD') throw new Error('R15 evaluation requires a clean frozen detached checkout');
  const out = resolve(output), trainingRoot = resolve(root), source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (existsSync(out)) throw new Error('R15 evaluation output already exists');
  const rows: unknown[] = readFileSync(resolve(trainingRoot, 'contexts/dev.jsonl'), 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  if (!rows.length || rows.length > 10000) throw new Error('R15 evaluation requires 1..10000 development rows');
  const inputs = rows.map<InputRow>(row => {
    if (!record(row) || typeof row.id !== 'string' || row.split !== 'dev' || ![48, 7].includes(Number(row.seed))
      || (row.phase !== 'kind' && row.phase !== 'target') || !record(row.soft) || !validateDecisionContext(row.context)
      || row.context.resourceChoice !== row.phase || JSON.stringify(row.packet) !== JSON.stringify(r15Packet(row.context))) throw new Error('invalid R15 development row');
    const packet = r15Packet(row.context), soft = row.soft;
    const teacher = Object.keys(packet.questions.action.criteria).map(key => soft[key]);
    if (!teacher.every((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1)
      || Math.abs(teacher.reduce((sum, v) => sum + v, 0) - 1) > 1e-8) throw new Error('invalid R15 teacher');
    return { id: row.id, phase: row.phase, teacher, packet };
  });
  if (!inputs.some(r => r.phase === 'kind') || !inputs.some(r => r.phase === 'target')) throw new Error('both R15 development phases are required');
  const adapter = arg('adapter', 'r15-resources-s7'), worker = new R15Worker({ trainingRoot, adapter }), started = Date.now();
  const scored: ScoredRow[] = [];
  mkdirSync(out, { recursive: true });
  writeAtomic(resolve(out, 'run.json'), JSON.stringify({ source, requestedAdapter: adapter, status: 'starting', devHash: hashR15(rows), wallCapSeconds: 3600 }));
  const interruption = r15Interruption(() => worker.close());
  try {
    await worker.start();
    interruption.check();
    writeAtomic(resolve(out, 'run.json'), JSON.stringify({ source, adapter: worker.manifest, devHash: hashR15(rows), wallCapSeconds: 3600 }));
    for (const row of inputs) {
      interruption.check();
      if (Date.now() - started > 3600000) throw new Error('R15 evaluation exceeded one-hour wall cap');
      const [probabilities] = await worker.score([{ adapter, packet: row.packet }]);
      const result = { id: row.id, phase: row.phase, teacher: row.teacher, probabilities };
      scored.push(result); writeFileSync(resolve(out, 'scores.jsonl'), JSON.stringify(result) + '\n', { flag: 'a' });
    }
    const summary = { source, adapter: worker.manifest, dataset: 'development', phases: summarizeR15Scores(scored),
      wallSeconds: (Date.now() - started) / 1000, scoresHash: hashR15(scored),
      limits: 'Rules-scaffold imitation on development animals; not held-out evaluation, population viability or wild behavior.' };
    writeAtomic(resolve(out, 'summary.json'), JSON.stringify(summary, null, 2)); console.log(JSON.stringify(summary));
  } catch (error) {
    if (existsSync(out)) writeAtomic(resolve(out, 'failure.json'), JSON.stringify({ error: error instanceof Error ? error.message : String(error), completed: scored.length }));
    throw error;
  } finally { try { await worker.close(); } finally { interruption.dispose(); } }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
