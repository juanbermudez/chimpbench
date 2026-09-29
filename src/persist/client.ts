import type { Committed, InitInfo, Loaded, Req, Res } from './protocol';
import type { NewSim, SimRow, SnapshotMeta, SnapshotRow } from './schema';

// Page-side RPC for the store worker: id-matched promises, byte buffers transferred (never copied).

export class StoreError extends Error {
  constructor(message: string, readonly kind: string) { super(message); this.name = 'StoreError'; }
}

export function createStoreClient() {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'mgogo-store' });
  let next = 1, dead = '';
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  worker.onmessage = (e: MessageEvent<Res>) => {
    const p = pending.get(e.data.id); if (!p) return;
    pending.delete(e.data.id);
    if (e.data.ok) p.resolve(e.data.result); else p.reject(new StoreError(e.data.error, e.data.name));
  };
  worker.onerror = e => {
    dead = `The save worker stopped: ${e.message || 'failed to load'}`;
    for (const p of pending.values()) p.reject(new StoreError(dead, 'WorkerError'));
    pending.clear();
  };
  function call<T>(req: Req, transfer: Transferable[] = []): Promise<T> {
    if (dead) return Promise.reject(new StoreError(dead, 'WorkerError'));
    const id = next++;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage({ ...req, id }, transfer);
    });
  }
  return {
    init: () => call<InitInfo>({ op: 'init' }),
    list: () => call<SimRow[]>({ op: 'list' }),
    snapshots: (simId: string) => call<SnapshotRow[]>({ op: 'snapshots', simId }),
    create: (sim: NewSim) => call<string>({ op: 'create', sim }),
    saveBegin: (saveId: number) => call<boolean>({ op: 'saveBegin', saveId }),
    saveChunk: (saveId: number, text: string) => call<boolean>({ op: 'saveChunk', saveId, text }),
    saveCommit: (saveId: number, simId: string, kind: 'auto' | 'manual' | 'import', meta: SnapshotMeta) => call<Committed>({ op: 'saveCommit', saveId, simId, kind, meta }),
    saveAbort: (saveId: number) => call<boolean>({ op: 'saveAbort', saveId }),
    saveWhole: (simId: string, kind: 'auto' | 'manual' | 'import', meta: SnapshotMeta, text: string) => call<Committed>({ op: 'saveWhole', simId, kind, meta, text }),
    load: (simId?: string, beforeId?: number) => call<Loaded | null>({ op: 'load', simId, beforeId }),
    rename: (simId: string, name: string) => call<boolean>({ op: 'rename', simId, name }),
    duplicate: (simId: string, newId: string, name: string) => call<string>({ op: 'duplicate', simId, newId, name }),
    remove: (simId: string) => call<boolean>({ op: 'delete', simId }),
    exportSim: (simId: string) => call<ArrayBuffer>({ op: 'exportSim', simId }),
    exportLibrary: () => call<ArrayBuffer>({ op: 'exportLibrary' }),
    importLibrary: (bytes: ArrayBuffer) => call<string[]>({ op: 'importLibrary', bytes }, [bytes]),
    estimate: () => call<{ usage: number | null; quota: number | null; persisted: boolean | null }>({ op: 'estimate' }),
    release: () => call<boolean>({ op: 'release' }),
    meta: (key: string, value?: string) => call<string | null>({ op: 'meta', key, value }),
  };
}
export type StoreClient = ReturnType<typeof createStoreClient>;
