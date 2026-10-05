// Protocol fingerprint and the logged freeze (docs/realism-design.md §3; C3 review; extended after the C7a review,
// finding 8), shared by scripts/field-metrics.ts and scripts/field-scenario.ts (stage C8 `--unseal` binding,
// docs/staging/early-life-prereg.md §1.2). The hash is computed exactly as field-metrics.ts computed it before the move
// (paths are hashed as seen from scripts/), so frozen values stay comparable.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCRIPTS = new URL('../', import.meta.url);
const TARGETS = new URL('../data/targets.json', SCRIPTS);
export const WORKER_FILE = new URL('./lib/field-worker.ts', SCRIPTS);

/**
 * sha256 over every observer source file, the worker, each target's id, role, band and observer protocol and its
 * verdict-changing flags (compromised, revised post hoc or post-freeze, tuned, held as fail, instrument warning, partially
 * encoded, not scorable; since the Track E freeze also a truth row's scoredOn and truthDefinition, and contested), the C12 fitted and seen declarations, the comparison code (src/compare/*.ts,
 * scripts/compare-*.ts) and the scenario scoring scripts (scripts/field-scenario.ts, scripts/c9-scenario.ts; since C9). data/targets.json protocolFreeze.hash records the frozen value; a mismatch means the protocol
 * changed after the freeze and must have a protocolLog entry (held-out targets it touches become compromised).
 */
const FLAG_FIELDS = ['compromised', 'protocolRevisedPostHoc', 'revisedPostFreeze', 'tuned', 'heldAsFail', 'instrumentWarning', 'partiallyEncoded', 'notScorable'] as const;
/**
 * Track E freeze (5 October 2026): a simulation-truth row's marker and definition, and the contested flag, decide how a row
 * is scored or whether it counts, so they are fingerprinted too; appended only to rows that carry them, so the
 * fingerprint of a targets file without them is unchanged.
 */
const TRACK_E_FIELDS = ['scoredOn', 'truthDefinition', 'contested'] as const;
export function protocolHash(): string {
  const h = createHash('sha256');
  // files committed at HEAD only (git ls-tree), so parallel agents' untracked or staged work in the same checkout cannot
  // move the hash (contents are read from disk); without git, every file in the directory
  const hashDir = (rel: string, keep: (f: string) => boolean) => {
    const dir = new URL(rel, SCRIPTS);
    let files = readdirSync(dir).filter(keep);
    try {
      const tracked = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '--', '.'], { cwd: fileURLToPath(dir), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean));
      if (tracked.size) files = files.filter(f => tracked.has(f));
    } catch { /* not a git checkout */ }
    for (const f of files.sort()) { h.update(`${rel}${f}`); h.update(readFileSync(new URL(f, dir))); }
  };
  hashDir('../src/field/', x => x.endsWith('.ts'));
  h.update(readFileSync(WORKER_FILE));
  hashDir('../src/compare/', x => x.endsWith('.ts'));
  hashDir('./', x => /^compare-.*\.ts$/.test(x) || x === 'c9-scenario.ts' || x === 'field-scenario.ts'); // scenario scoring (T-FIS, T-LET-4) since C9
  const t = JSON.parse(readFileSync(TARGETS, 'utf8')) as { targets: ({ id: string; role: string; encoded: boolean; accept: unknown; observer: unknown } & Record<string, unknown>)[]; c12Fitted?: unknown };
  h.update(JSON.stringify(t.targets.map(x => {
    const row: unknown[] = [x.id, x.role, x.encoded, x.accept, x.observer, FLAG_FIELDS.map(k => x[k] ?? null)];
    if (TRACK_E_FIELDS.some(k => x[k] !== undefined)) row.push(TRACK_E_FIELDS.map(k => x[k] ?? null));
    return row;
  })));
  h.update(JSON.stringify(t.c12Fitted ?? null));
  return h.digest('hex').slice(0, 16);
}

/** The logged protocol freeze (stage, protocol hash and, from C8, the parameter-registry hash). */
export function frozen(): { hash: string | null; stage: string | null; registryHash: string | null } {
  const t = JSON.parse(readFileSync(TARGETS, 'utf8')) as { protocolFreeze?: { hash: string; stage: string; registryHash?: string } };
  return { hash: t.protocolFreeze?.hash ?? null, stage: t.protocolFreeze?.stage ?? null, registryHash: t.protocolFreeze?.registryHash ?? null };
}
