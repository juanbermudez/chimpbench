// The SQL layer: schema, migrations and every query, written against a small adapter so the same code runs on
// the opfs-sahpool database in the store worker and on an in-memory database in Node tests.

/** The subset of SQLite WASM's oo1 API used here (the worker and the tests wrap a real oo1.DB). */
export interface Sql {
  run(sql: string, bind?: unknown[]): void;
  value(sql: string, bind?: unknown[]): unknown;
  rows<T = Record<string, unknown>>(sql: string, bind?: unknown[]): T[];
  tx<T>(fn: () => T): T;
}

export const SCHEMA_VERSION = 1;
/** Autosaves kept per simulation; manual saves and imports are kept until deleted. */
export const KEEP_AUTO = 3;

export interface SimRow {
  id: string; name: string; seed: number; createdAt: number; updatedAt: number;
  simTime: number; day: number; hour: number; tick: number; population: number; ageRate: number;
  communities: string; appVersion: string; format: number; stateVersion: number; stateShape: string;
  parentId: string | null; snapshots: number; bytes: number;
}
export interface SnapshotMeta {
  tick: number; simTime: number; day: number; hour: number; population: number; ageRate: number; communities: string;
  format: number; stateVersion: number; stateShape: string; appVersion: string;
}
export interface SnapshotRow { id: number; simId: string; kind: string; savedAt: number; tick: number; rawBytes: number; bytes: number; format: number; stateVersion: number; stateShape: string; appVersion: string }
export type NewSim = Pick<SimRow, 'id' | 'name' | 'seed'> & SnapshotMeta & { parentId?: string | null };

export class ReadOnlyError extends Error {
  constructor(v: number) { super(`This browser's saves were written by a newer MGOGO (database schema ${v}; this build knows ${SCHEMA_VERSION}). They open read-only here so nothing is lost.`); this.name = 'ReadOnlyError'; }
}

/** Creates or upgrades the schema. Returns the version found; throws ReadOnlyError for a newer database. */
export function migrate(db: Sql): number {
  const v = Number(db.value('PRAGMA user_version'));
  if (v > SCHEMA_VERSION) throw new ReadOnlyError(v);
  if (v === 0) {
    // auto_vacuum only takes effect before the first table exists; it lets delete give space back.
    db.run('PRAGMA auto_vacuum = INCREMENTAL');
    db.tx(() => {
      db.run(`CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT`);
      db.run(`CREATE TABLE simulations (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, seed INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        sim_time REAL NOT NULL, day INTEGER NOT NULL, hour REAL NOT NULL, tick INTEGER NOT NULL, population INTEGER NOT NULL, age_rate REAL NOT NULL,
        communities TEXT NOT NULL, app_version TEXT NOT NULL, format INTEGER NOT NULL, state_version INTEGER NOT NULL, state_shape TEXT NOT NULL,
        parent_id TEXT REFERENCES simulations(id) ON DELETE SET NULL) STRICT`);
      db.run(`CREATE TABLE snapshots (
        id INTEGER PRIMARY KEY, sim_id TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('auto','manual','import')), saved_at INTEGER NOT NULL,
        tick INTEGER NOT NULL, sim_time REAL NOT NULL, day INTEGER NOT NULL, population INTEGER NOT NULL,
        format INTEGER NOT NULL, state_version INTEGER NOT NULL, state_shape TEXT NOT NULL, app_version TEXT NOT NULL,
        encoding TEXT NOT NULL, raw_bytes INTEGER NOT NULL, data BLOB NOT NULL) STRICT`);
      db.run('CREATE INDEX snapshots_by_sim ON snapshots(sim_id, id DESC)');
      db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  }
  return v;
}

const SIM_COLUMNS = `s.id, s.name, s.seed, s.created_at AS createdAt, s.updated_at AS updatedAt, s.sim_time AS simTime, s.day, s.hour, s.tick,
  s.population, s.age_rate AS ageRate, s.communities, s.app_version AS appVersion, s.format, s.state_version AS stateVersion,
  s.state_shape AS stateShape, s.parent_id AS parentId`;

export function listSims(db: Sql): SimRow[] {
  return db.rows<SimRow>(`SELECT ${SIM_COLUMNS}, COUNT(n.id) AS snapshots, COALESCE(SUM(LENGTH(n.data)), 0) AS bytes
    FROM simulations s LEFT JOIN snapshots n ON n.sim_id = s.id GROUP BY s.id ORDER BY s.updated_at DESC, s.id`);
}

export function getSim(db: Sql, id: string): SimRow | undefined {
  return listSims(db).find(s => s.id === id);
}

export function createSim(db: Sql, s: NewSim, now: number): void {
  db.run(`INSERT INTO simulations (id, name, seed, created_at, updated_at, sim_time, day, hour, tick, population, age_rate, communities, app_version, format, state_version, state_shape, parent_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [s.id, s.name, s.seed, now, now, s.simTime, s.day, s.hour, s.tick, s.population, s.ageRate, s.communities, s.appVersion, s.format, s.stateVersion, s.stateShape, s.parentId ?? null]);
  setMeta(db, 'last_sim', s.id);
}

/**
 * One transaction: the snapshot, the simulation's summary, autosave-ring pruning and the "last opened" pointer.
 * A crash anywhere inside leaves the previous state intact (rollback journal).
 */
export function insertSnapshot(db: Sql, simId: string, kind: 'auto' | 'manual' | 'import', m: SnapshotMeta, rawBytes: number, data: Uint8Array, now: number, keepAuto = KEEP_AUTO): number {
  return db.tx(() => {
    if (!db.value('SELECT 1 FROM simulations WHERE id = ?', [simId])) throw new Error(`Simulation ${simId} no longer exists (deleted in the meantime?)`);
    db.run(`INSERT INTO snapshots (sim_id, kind, saved_at, tick, sim_time, day, population, format, state_version, state_shape, app_version, encoding, raw_bytes, data)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'json+gzip',?,?)`, [simId, kind, now, m.tick, m.simTime, m.day, m.population, m.format, m.stateVersion, m.stateShape, m.appVersion, rawBytes, data]);
    const id = Number(db.value('SELECT last_insert_rowid()'));
    db.run(`UPDATE simulations SET updated_at = ?, sim_time = ?, day = ?, hour = ?, tick = ?, population = ?, age_rate = ?, communities = ?,
      app_version = ?, format = ?, state_version = ?, state_shape = ? WHERE id = ?`,
    [now, m.simTime, m.day, m.hour, m.tick, m.population, m.ageRate, m.communities, m.appVersion, m.format, m.stateVersion, m.stateShape, simId]);
    db.run(`DELETE FROM snapshots WHERE sim_id = ? AND kind = 'auto' AND id NOT IN
      (SELECT id FROM snapshots WHERE sim_id = ? AND kind = 'auto' ORDER BY id DESC LIMIT ?)`, [simId, simId, keepAuto]);
    setMeta(db, 'last_sim', simId);
    return id;
  });
}

export function listSnapshots(db: Sql, simId: string): SnapshotRow[] {
  return db.rows<SnapshotRow>(`SELECT id, sim_id AS simId, kind, saved_at AS savedAt, tick, raw_bytes AS rawBytes, LENGTH(data) AS bytes, format,
    state_version AS stateVersion, state_shape AS stateShape, app_version AS appVersion FROM snapshots WHERE sim_id = ? ORDER BY id DESC`, [simId]);
}

/** Newest snapshot of a simulation, or the newest one older than `beforeId` (fallback past a corrupt blob). */
export function snapshotData(db: Sql, simId: string, beforeId?: number): (SnapshotRow & { data: Uint8Array }) | undefined {
  return db.rows<SnapshotRow & { data: Uint8Array }>(`SELECT id, sim_id AS simId, kind, saved_at AS savedAt, tick, raw_bytes AS rawBytes, LENGTH(data) AS bytes, format,
    state_version AS stateVersion, state_shape AS stateShape, app_version AS appVersion, data FROM snapshots
    WHERE sim_id = ? AND id < ? ORDER BY id DESC LIMIT 1`, [simId, beforeId ?? Number.MAX_SAFE_INTEGER])[0];
}

export function renameSim(db: Sql, id: string, name: string, now: number): void {
  db.run('UPDATE simulations SET name = ?, updated_at = ? WHERE id = ?', [name, now, id]);
}

/** A branch: the newest snapshot only, under a new simulation that remembers its parent. */
export function duplicateSim(db: Sql, id: string, newId: string, name: string, now: number): void {
  db.tx(() => {
    db.run(`INSERT INTO simulations (id, name, seed, created_at, updated_at, sim_time, day, hour, tick, population, age_rate, communities, app_version, format, state_version, state_shape, parent_id)
      SELECT ?, ?, seed, ?, ?, sim_time, day, hour, tick, population, age_rate, communities, app_version, format, state_version, state_shape, id FROM simulations WHERE id = ?`, [newId, name, now, now, id]);
    db.run(`INSERT INTO snapshots (sim_id, kind, saved_at, tick, sim_time, day, population, format, state_version, state_shape, app_version, encoding, raw_bytes, data)
      SELECT ?, 'manual', saved_at, tick, sim_time, day, population, format, state_version, state_shape, app_version, encoding, raw_bytes, data
      FROM snapshots WHERE sim_id = ? ORDER BY id DESC LIMIT 1`, [newId, id]);
  });
}

/** meta key recording that the user chose to run this simulation with the registry named in the value. */
export const paramsAcceptedKey = (simId: string) => `params_ok:${simId}`;

export function deleteSim(db: Sql, id: string): void {
  db.run('DELETE FROM simulations WHERE id = ?', [id]);
  if (getMeta(db, 'last_sim') === id) db.run(`DELETE FROM meta WHERE key = 'last_sim'`);
  db.run('DELETE FROM meta WHERE key = ?', [paramsAcceptedKey(id)]);
  db.run('PRAGMA incremental_vacuum');
}

export function getMeta(db: Sql, key: string): string | null {
  const v = db.value('SELECT value FROM meta WHERE key = ?', [key]);
  return v === undefined || v === null ? null : String(v);
}
export function setMeta(db: Sql, key: string, value: string): void {
  db.run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

/** Copies every simulation of an attached database (alias `imp`) in with fresh ids; never overwrites. Returns the new ids. */
export function mergeAttached(db: Sql, newId: () => string, now: number): string[] {
  const v = Number(db.value('PRAGMA imp.user_version'));
  if (v < 1 || v > SCHEMA_VERSION) throw new Error(`The imported file has database schema ${v}; this build reads 1–${SCHEMA_VERSION}`);
  return db.tx(() => {
    const ids: string[] = [];
    for (const { id } of db.rows<{ id: string }>('SELECT id FROM imp.simulations ORDER BY updated_at')) {
      const nid = newId();
      db.run(`INSERT INTO simulations (id, name, seed, created_at, updated_at, sim_time, day, hour, tick, population, age_rate, communities, app_version, format, state_version, state_shape, parent_id)
        SELECT ?, name || ' (imported)', seed, created_at, ?, sim_time, day, hour, tick, population, age_rate, communities, app_version, format, state_version, state_shape, NULL
        FROM imp.simulations WHERE id = ?`, [nid, now, id]);
      db.run(`INSERT INTO snapshots (sim_id, kind, saved_at, tick, sim_time, day, population, format, state_version, state_shape, app_version, encoding, raw_bytes, data)
        SELECT ?, kind, saved_at, tick, sim_time, day, population, format, state_version, state_shape, app_version, encoding, raw_bytes, data
        FROM imp.snapshots WHERE sim_id = ? ORDER BY id`, [nid, id]);
      ids.push(nid);
    }
    return ids;
  });
}
