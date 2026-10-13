import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDecisionContext, record } from '../src/sim/context-check';
import { r15Packet } from '../src/providers/packet';
import { requireCleanSource } from './r15-contexts';

requireCleanSource();
const rootIndex = process.argv.indexOf('--root');
if (rootIndex < 0 || !process.argv[rootIndex + 1]) throw new Error('--root required');
const root = resolve(process.argv[rootIndex + 1]), rows: { id: string; phase: string; hash: string }[] = [];
for (const split of ['train', 'dev']) {
  for (const line of readFileSync(resolve(root, 'contexts', `${split}.jsonl`), 'utf8').split('\n').filter(Boolean)) {
    const row: unknown = JSON.parse(line);
    if (!record(row) || typeof row.id !== 'string' || !validateDecisionContext(row.context)
      || (row.phase !== 'kind' && row.phase !== 'target') || row.context.resourceChoice !== row.phase) throw new Error('invalid R15 row/context');
    const packet = JSON.stringify(r15Packet(row.context));
    const hash = createHash('sha256').update(packet).digest('hex');
    if (packet !== JSON.stringify(row.packet) || hash !== row.packetHash) throw new Error(`R15 live packet mismatch: ${row.id}`);
    rows.push({ id: row.id, phase: row.phase, hash });
  }
}
writeFileSync(resolve(root, 'preflight/packets.json'), JSON.stringify({ passed: true, rows }), { flag: 'wx' });
