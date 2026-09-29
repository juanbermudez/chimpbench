/// <reference lib="webworker" />
// Store worker: SQLite WASM with the opfs-sahpool VFS (no COOP/COEP headers needed). It owns the save library
// file, gzips snapshots with the native CompressionStream and runs every query, so none of that touches the
// frame loop. Requests run strictly one at a time. Design: docs/persistence.md.
import sqlite3InitModule, { type Database, type SAHPoolUtil } from '@sqlite.org/sqlite-wasm';
import { adapt } from './adapter';
import type { InitInfo, Req, Res, StoreState } from './protocol';
import {
  ReadOnlyError, createSim, deleteSim, duplicateSim, getMeta, setMeta, insertSnapshot, listSims, listSnapshots, mergeAttached, migrate, renameSim, snapshotData, type Sql,
} from './schema';

const FILE = '/mgogo.sqlite3', IMPORT_FILE = '/import.sqlite3';
const encoder = new TextEncoder();
const scope = self as unknown as DedicatedWorkerGlobalScope;
let state: StoreState = 'error', message = 'not started', sqliteVersion = '';
let raw: Database | null = null, db: Sql | null = null, pool: SAHPoolUtil | null = null;
let releaseLock: (() => void) | null = null;
const streams = new Map<number, { writer: WritableStreamDefaultWriter<BufferSource>; out: Promise<ArrayBuffer>; raw: number; failed: string }>();

const now = () => performance.now();
async function pipe(bytes: BufferSource, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

/** Storage errors in words a user can act on; the original text is kept at the end for debugging. */
function friendly(e: unknown): Error {
  const text = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  if (/quota|SQLITE_FULL|disk is full|database or disk is full/i.test(text)) return new Error(`Browser storage is full: delete or export old simulations, then try again. (${text})`);
  if (/SQLITE_CORRUPT|SQLITE_NOTADB|malformed/i.test(text)) return new Error(`The save library looks damaged; export what still opens. (${text})`);
  return e instanceof Error ? e : new Error(text);
}

function opfsAvailable(): boolean {
  return typeof navigator.storage?.getDirectory === 'function' && typeof FileSystemFileHandle !== 'undefined' && 'createSyncAccessHandle' in FileSystemFileHandle.prototype;
}

async function estimate() {
  try { const e = await navigator.storage.estimate(); return { usage: e.usage ?? null, quota: e.quota ?? null, persisted: (await navigator.storage.persisted?.()) ?? null }; }
  catch { return { usage: null, quota: null, persisted: null }; }
}

function openDb(database: Database) {
  raw = database; db = adapt(database);
  database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = TRUNCATE; PRAGMA synchronous = FULL;');
}

async function init(): Promise<InitInfo> {
  const t0 = now();
  const sqlite3 = await sqlite3InitModule();
  sqliteVersion = sqlite3.version.libVersion;
  const memory = (why: string) => { openDb(new sqlite3.oo1.DB(':memory:', 'c')); migrate(db!); state = 'memory'; message = why; };
  if (!opfsAvailable()) memory('This browser gives this page no private file storage (a private window?), so saves last only until the tab closes. Export to keep them.');
  else {
    // One tab owns the library: OPFS sync access handles are exclusive, so a second opfs-sahpool would fail
    // inside the VFS. The Web Lock makes ownership explicit and is released when this worker (its tab) dies.
    const got = await new Promise<boolean>(resolve => {
      navigator.locks.request('mgogo-store', { ifAvailable: true }, lock => {
        if (!lock) { resolve(false); return undefined; }
        resolve(true);
        return new Promise<void>(release => { releaseLock = release; });
      }).catch(() => resolve(false));
    });
    if (!got) { state = 'locked'; message = 'MGOGO is open in another tab, which keeps the save library. This tab runs without saving.'; }
    else {
      try {
        pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'mgogo-pool', directory: '.mgogo-pool', initialCapacity: 8 });
        await pool.reserveMinimumCapacity(8); // library + journal, and an imported file + its journal
        openDb(new pool.OpfsSAHPoolDb(FILE));
        try { migrate(db!); state = 'ready'; message = ''; }
        catch (e) { if (!(e instanceof ReadOnlyError)) throw e; state = 'readonly'; message = e.message; }
      } catch (e) {
        releaseLock?.(); releaseLock = null;
        memory(`Browser storage could not be opened, so saves last only until the tab closes. Export to keep them. (${e instanceof Error ? e.message : e})`);
      }
    }
  }
  const lastSim = db ? getMeta(db, 'last_sim') : null;
  return { state, message, sqlite: sqliteVersion, lastSim, ...(await estimate()), ms: now() - t0 };
}

function need(write: boolean): Sql {
  if (!db) throw new Error(message || `Saving is unavailable (${state})`);
  if (write && state === 'readonly') throw new Error(message);
  return db;
}

async function handle(req: Req): Promise<{ result: unknown; transfer?: Transferable[] }> {
  switch (req.op) {
    case 'init': return { result: await init() };
    case 'list': return { result: listSims(need(false)) };
    case 'snapshots': return { result: listSnapshots(need(false), req.simId) };
    case 'create': createSim(need(true), req.sim, Date.now()); return { result: req.sim.id };
    case 'saveBegin': {
      const cs = new CompressionStream('gzip');
      const s = { writer: cs.writable.getWriter(), out: new Response(cs.readable).arrayBuffer(), raw: 0, failed: '' };
      s.out.catch(() => {}); // surfaced at commit
      streams.set(req.saveId, s);
      return { result: true };
    }
    case 'saveChunk': {
      const s = streams.get(req.saveId);
      if (s && !s.failed) {
        const bytes = encoder.encode(req.text);
        s.raw += bytes.byteLength;
        try { await s.writer.ready; s.writer.write(bytes).catch(e => { s.failed = String(e); }); } catch (e) { s.failed = String(e); }
      }
      return { result: true };
    }
    case 'saveAbort': { const s = streams.get(req.saveId); streams.delete(req.saveId); await s?.writer.abort().catch(() => {}); return { result: true }; }
    case 'saveCommit': {
      const s = streams.get(req.saveId);
      streams.delete(req.saveId);
      if (!s) throw new Error('Save stream missing (worker restarted?)');
      if (s.failed) throw new Error(`Compressing the save failed: ${s.failed}`);
      const t0 = now();
      await s.writer.close();
      const data = new Uint8Array(await s.out);
      const t1 = now();
      const id = insertSnapshot(need(true), req.simId, req.kind, req.meta, s.raw, data, Date.now());
      return { result: { id, bytes: data.length, rawBytes: s.raw, ms: { gzip: t1 - t0, write: now() - t1 } } };
    }
    case 'saveWhole': {
      const t0 = now(), bytes = encoder.encode(req.text);
      const data = await pipe(bytes, new CompressionStream('gzip'));
      const t1 = now();
      const id = insertSnapshot(need(true), req.simId, req.kind, req.meta, bytes.byteLength, data, Date.now());
      return { result: { id, bytes: data.length, rawBytes: bytes.byteLength, ms: { gzip: t1 - t0, write: now() - t1 } } };
    }
    case 'load': {
      const d = need(false), t0 = now();
      const simId = req.simId ?? getMeta(d, 'last_sim');
      const sim = simId ? listSims(d).find(s => s.id === simId) : undefined;
      if (!sim) return { result: null };
      // A blob that fails gzip's CRC is skipped for the next older snapshot; JSON problems are the page's to report.
      let before = req.beforeId, skipped = 0;
      for (;;) {
        const t1 = now();
        const row = snapshotData(d, sim.id, before);
        if (!row) return { result: null };
        const t2 = now();
        try {
          const json = await pipe(row.data as Uint8Array<ArrayBuffer>, new DecompressionStream('gzip'));
          const { data: _data, ...snapshot } = row;
          return { result: { sim, snapshot, json: json.buffer, skipped, ms: { select: t2 - t1 + (t1 - t0), gunzip: now() - t2 } }, transfer: [json.buffer] };
        } catch { skipped++; before = row.id; }
      }
    }
    case 'rename': renameSim(need(true), req.simId, req.name, Date.now()); return { result: true };
    case 'duplicate': duplicateSim(need(true), req.simId, req.newId, req.name, Date.now()); return { result: req.newId };
    case 'delete': deleteSim(need(true), req.simId); return { result: true };
    case 'exportSim': {
      const row = snapshotData(need(false), req.simId);
      if (!row) throw new Error('This simulation has no saved snapshot yet');
      return { result: row.data.buffer, transfer: [row.data.buffer] };
    }
    case 'exportLibrary': {
      if (!pool || state === 'memory') {
        // In-memory libraries export through SQLite's own serializer.
        const sqlite3 = await sqlite3InitModule();
        const bytes = sqlite3.capi.sqlite3_js_db_export(raw!);
        return { result: bytes.buffer, transfer: [bytes.buffer] };
      }
      const bytes = await pool.exportFile(FILE);
      return { result: bytes.buffer, transfer: [bytes.buffer] };
    }
    case 'importLibrary': {
      const d = need(true);
      if (!pool) throw new Error('Importing a .sqlite3 library needs browser file storage, which this tab does not have');
      await pool.importDb(IMPORT_FILE, req.bytes);
      raw!.exec(`ATTACH 'file:${IMPORT_FILE}?vfs=mgogo-pool' AS imp`);
      try { return { result: mergeAttached(d, () => crypto.randomUUID(), Date.now()) }; }
      finally { raw!.exec('DETACH imp'); pool.unlink(IMPORT_FILE); }
    }
    case 'estimate': return { result: await estimate() };
    case 'meta': { if (req.value !== undefined) setMeta(need(true), req.key, req.value); return { result: getMeta(need(false), req.key) }; }
    case 'release': {
      // Hand the library to another tab: close, let go of the OPFS handles, drop the lock.
      raw?.close(); raw = null; db = null;
      pool?.pauseVfs();
      releaseLock?.(); releaseLock = null;
      state = 'released'; message = 'Saving continues in another tab.';
      return { result: true };
    }
  }
}

let chain: Promise<void> = Promise.resolve();
scope.onmessage = (e: MessageEvent<Req & { id: number }>) => {
  const req = e.data;
  chain = chain.then(async () => {
    try {
      const { result, transfer } = await handle(req);
      scope.postMessage({ id: req.id, ok: true, result } satisfies Res, transfer ?? []);
    } catch (error) {
      const f = friendly(error);
      scope.postMessage({ id: req.id, ok: false, error: f.message, name: error instanceof Error ? error.name : 'Error' } satisfies Res);
    }
  });
};
