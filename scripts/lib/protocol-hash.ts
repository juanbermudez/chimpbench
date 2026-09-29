// Protocol fingerprint and the logged freeze (docs/realism-design.md §3; C3 review), shared by scripts/field-metrics.ts
// and scripts/field-scenario.ts (stage C8 `--unseal` binding, docs/staging/early-life-prereg.md §1.2).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const TARGETS = new URL('../../data/targets.json', import.meta.url);
export const WORKER_FILE = new URL('./field-worker.ts', import.meta.url);

/**
 * sha256 over every observer source file, the worker, and each target's id, role, band and observer protocol.
 * data/targets.json protocolFreeze.hash records the frozen value; a mismatch means the protocol changed after the freeze.
 */
export function protocolHash(): string {
  const h = createHash('sha256');
  const dir = new URL('../../src/field/', import.meta.url);
  for (const f of readdirSync(dir).filter(x => x.endsWith('.ts')).sort()) { h.update(f); h.update(readFileSync(new URL(f, dir))); }
  h.update(readFileSync(WORKER_FILE));
  const t = JSON.parse(readFileSync(TARGETS, 'utf8')) as { targets: { id: string; role: string; encoded: boolean; accept: unknown; observer: unknown }[] };
  h.update(JSON.stringify(t.targets.map(x => [x.id, x.role, x.encoded, x.accept, x.observer])));
  return h.digest('hex').slice(0, 16);
}

/** The logged protocol freeze (stage, protocol hash and, from C8, the parameter-registry hash). */
export function frozen(): { hash: string | null; stage: string | null; registryHash: string | null } {
  const t = JSON.parse(readFileSync(TARGETS, 'utf8')) as { protocolFreeze?: { hash: string; stage: string; registryHash?: string } };
  return { hash: t.protocolFreeze?.hash ?? null, stage: t.protocolFreeze?.stage ?? null, registryHash: t.protocolFreeze?.registryHash ?? null };
}
