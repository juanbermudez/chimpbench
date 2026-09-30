import type { NewSim, SimRow, SnapshotMeta, SnapshotRow } from './schema';

// Messages between the page and the store worker (src/persist/worker.ts). Plain data; byte buffers are transferred.

/**
 * ready: OPFS-backed and writable. memory: no OPFS here (private window, old browser); works until the tab closes.
 * locked: another tab owns the library. readonly: written by a newer ChimpBench. released: handed to another tab.
 * error: storage could not start (message says why).
 */
export type StoreState = 'ready' | 'memory' | 'locked' | 'readonly' | 'released' | 'error';

export interface InitInfo {
  state: StoreState; message: string; sqlite: string; lastSim: string | null;
  usage: number | null; quota: number | null; persisted: boolean | null; ms: number;
}
export interface Loaded { sim: SimRow; snapshot: SnapshotRow; json: ArrayBuffer; skipped: number; ms: { select: number; gunzip: number } }
export interface Committed { id: number; bytes: number; rawBytes: number; ms: { gzip: number; write: number } }

export type Req =
  | { op: 'init' }
  | { op: 'list' }
  | { op: 'snapshots'; simId: string }
  | { op: 'create'; sim: NewSim }
  | { op: 'saveBegin'; saveId: number }
  /** JSON text, encoded to UTF-8 in the worker so the page never pays for it. */
  | { op: 'saveChunk'; saveId: number; text: string }
  | { op: 'saveCommit'; saveId: number; simId: string; kind: 'auto' | 'manual' | 'import'; meta: SnapshotMeta }
  | { op: 'saveAbort'; saveId: number }
  | { op: 'saveWhole'; simId: string; kind: 'auto' | 'manual' | 'import'; meta: SnapshotMeta; text: string }
  | { op: 'load'; simId?: string; beforeId?: number }
  | { op: 'rename'; simId: string; name: string }
  | { op: 'duplicate'; simId: string; newId: string; name: string }
  | { op: 'delete'; simId: string }
  | { op: 'exportSim'; simId: string }
  | { op: 'exportLibrary' }
  | { op: 'importLibrary'; bytes: ArrayBuffer }
  | { op: 'estimate' }
  | { op: 'meta'; key: string; value?: string }
  | { op: 'release' };

export type Res = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string; name: string };
