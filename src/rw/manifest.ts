// Stage RW bench (docs/staging/rw-bench-prereg.md §7 and §8): which scorecard targets are compromised for a kernel
// trained on wild choices, and the manifest such a kernel carries. Pure: the caller reads the files.
// data/targets.json is frozen (its hash is the protocol freeze) and holds no such mark; the list lives in
// data/rw-compromised.json and is applied by reports through this helper.

/** data/rw-compromised.json. */
export interface CompromisedList {
  /** The label source a manifest must name for the list to apply. */
  labelSource: string;
  decision: string;
  targets: { id: string; overlap: string; reason: string }[];
}

/** The manifest of a kernel trained on labels (documented format; nothing is trained in this stage). */
export interface KernelManifest {
  name: string; kind: 'adapter' | 'stand-in';
  baseModel: string;
  /** Every label source the kernel was trained on. */
  labelSources: string[];
  /** The part of the wild records used: train only. */
  part: 'train';
  records: number;
  /** sha256 (hex) of the sorted record keys, one per line; and of the split rule text. Fingerprints: no key is committed. */
  recordIdsHash: string; splitRuleHash: string;
  packet: { version: string; seed: number; shuffles: number[] };
  created: string; commit: string;
}

const HEX64 = /^[0-9a-f]{64}$/;
/** Why a manifest is not acceptable, or ''. */
export function manifestError(m: unknown): string {
  if (typeof m !== 'object' || m === null) return 'not a record';
  const x = m as Record<string, unknown>;
  if (typeof x.name !== 'string' || !x.name) return 'name';
  if (x.kind !== 'adapter' && x.kind !== 'stand-in') return 'kind';
  if (!Array.isArray(x.labelSources) || !x.labelSources.length || !x.labelSources.every(s => typeof s === 'string' && s)) return 'label sources';
  if (x.part !== 'train') return 'part (train only; the development and held-out parts are never trained on)';
  if (!Number.isInteger(x.records) || (x.records as number) <= 0) return 'records';
  if (typeof x.recordIdsHash !== 'string' || !HEX64.test(x.recordIdsHash) || typeof x.splitRuleHash !== 'string' || !HEX64.test(x.splitRuleHash)) return 'hashes';
  const p = x.packet as Record<string, unknown> | undefined;
  if (typeof p !== 'object' || p === null || typeof p.version !== 'string' || !Number.isInteger(p.seed) || !Array.isArray(p.shuffles)) return 'packet';
  return '';
}

const norm = (s: string) => s.trim().toLowerCase();
/**
 * The targets compromised for a kernel: id → reason. Empty unless the kernel's manifest names the list's label source
 * (a kernel only scored on wild choices, or trained on other labels, is not marked).
 */
export function compromisedFor(manifest: Pick<KernelManifest, 'labelSources'> | null | undefined, list: CompromisedList): Map<string, string> {
  const named = (manifest?.labelSources ?? []).some(s => norm(s) === norm(list.labelSource));
  return new Map(named ? list.targets.map(t => [t.id, t.reason]) : []);
}
/** Scorecard rows with `compromised` (the reason) set on those the kernel's training data overlaps; other rows are returned as they are. */
export function flagCompromised<T extends { id: string }>(rows: T[], manifest: Pick<KernelManifest, 'labelSources'> | null | undefined, list: CompromisedList): (T & { compromised?: string })[] {
  const marks = compromisedFor(manifest, list);
  return rows.map(r => marks.has(r.id) ? { ...r, compromised: marks.get(r.id)! } : r);
}
