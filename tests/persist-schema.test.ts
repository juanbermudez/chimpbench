import assert from 'node:assert/strict';
import test from 'node:test';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { adapt } from '../src/persist/adapter';
import {
  KEEP_AUTO, ReadOnlyError, SCHEMA_VERSION, createSim, deleteSim, duplicateSim, getMeta, insertSnapshot, listSims, listSnapshots,
  mergeAttached, migrate, paramsAcceptedKey, renameSim, setMeta, snapshotData, type NewSim, type SnapshotMeta,
} from '../src/persist/schema';

// The SQL layer runs unchanged on SQLite WASM's Node build (in-memory; OPFS exists only in browsers).
const sqlite3 = await sqlite3InitModule();
const open = () => { const raw = new sqlite3.oo1.DB(':memory:', 'c'); raw.exec('PRAGMA foreign_keys = ON'); const db = adapt(raw); migrate(db); return { raw, db }; };
const meta = (tick: number): SnapshotMeta => ({ tick, simTime: tick / 240, day: 1, hour: 6.5, population: 49, ageRate: 1, communities: '[]', format: 1, stateVersion: 1, stateShape: 'abc', appVersion: '0.2.0' });
const sim = (id: string, name = id): NewSim => ({ id, name, seed: 48, ...meta(0) });
const blob = (n: number) => new Uint8Array([0x1f, 0x8b, n]);

test('migrate creates the schema once and refuses a newer database', () => {
  const { raw, db } = open();
  assert.equal(migrate(db), SCHEMA_VERSION);
  assert.equal(Number(db.value('PRAGMA user_version')), SCHEMA_VERSION);
  raw.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
  assert.throws(() => migrate(db), ReadOnlyError);
});

test('autosave ring keeps the newest K autosaves and never drops manual saves', () => {
  const { db } = open();
  createSim(db, sim('a'), 1);
  insertSnapshot(db, 'a', 'manual', meta(5), 3, blob(0), 2);
  for (let i = 1; i <= 6; i++) insertSnapshot(db, 'a', 'auto', meta(10 * i), 3, blob(i), 2 + i);
  const snaps = listSnapshots(db, 'a');
  assert.equal(snaps.filter(s => s.kind === 'auto').length, KEEP_AUTO);
  assert.deepEqual(snaps.filter(s => s.kind === 'auto').map(s => s.tick), [60, 50, 40]);
  assert.equal(snaps.filter(s => s.kind === 'manual').length, 1);
  const [row] = listSims(db);
  assert.equal(row.tick, 60); assert.equal(row.snapshots, 4); assert.equal(getMeta(db, 'last_sim'), 'a');
});

test('load falls back to older snapshots on request, newest first', () => {
  const { db } = open();
  createSim(db, sim('a'), 1);
  const ids = [1, 2, 3].map(i => insertSnapshot(db, 'a', 'manual', meta(i), 3, blob(i), i));
  assert.equal(snapshotData(db, 'a')!.id, ids[2]);
  assert.equal(snapshotData(db, 'a', ids[2])!.id, ids[1]);
  assert.deepEqual([...snapshotData(db, 'a', ids[1])!.data], [0x1f, 0x8b, 1]);
  assert.equal(snapshotData(db, 'a', ids[0]), undefined);
});

test('rename, duplicate (newest snapshot only) and cascading delete', () => {
  const { db } = open();
  createSim(db, sim('a', 'Seed 48'), 1);
  insertSnapshot(db, 'a', 'auto', meta(1), 3, blob(1), 2); insertSnapshot(db, 'a', 'auto', meta(2), 3, blob(2), 3);
  renameSim(db, 'a', 'Kanyawara run', 4);
  duplicateSim(db, 'a', 'b', 'Kanyawara run (copy)', 5);
  const b = listSims(db).find(s => s.id === 'b')!;
  assert.equal(b.parentId, 'a'); assert.equal(b.snapshots, 1); assert.equal(b.tick, 2);
  assert.equal(listSims(db).find(s => s.id === 'a')!.name, 'Kanyawara run');
  deleteSim(db, 'a');
  assert.deepEqual(listSims(db).map(s => s.id), ['b']);
  assert.equal(listSims(db)[0].parentId, null);
  assert.equal(Number(db.value("SELECT COUNT(*) FROM snapshots WHERE sim_id = 'a'")), 0);
  assert.throws(() => insertSnapshot(db, 'a', 'auto', meta(3), 3, blob(3), 6), /no longer exists/);
});

test('importing another library merges with fresh ids and never overwrites', () => {
  const { raw, db } = open();
  createSim(db, sim('a', 'Mine'), 1); insertSnapshot(db, 'a', 'manual', meta(1), 3, blob(1), 1);
  raw.exec(`ATTACH ':memory:' AS imp`);
  // Same schema in the attached database, holding a simulation whose id collides with ours.
  const schema = raw.selectValues(`SELECT sql FROM sqlite_schema WHERE type IN ('table','index') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'`) as string[];
  for (const s of schema) raw.exec(s.replace(/^CREATE (TABLE|INDEX) (\w+)( ON (\w+))?/, (_m, kind, name, on, table) => `CREATE ${kind} imp.${name}${on ? ` ON ${table}` : ''}`));
  raw.exec(`PRAGMA imp.user_version = ${SCHEMA_VERSION}`);
  raw.exec(`INSERT INTO imp.simulations SELECT * FROM main.simulations`);
  raw.exec(`INSERT INTO imp.snapshots (sim_id, kind, saved_at, tick, sim_time, day, population, format, state_version, state_shape, app_version, encoding, raw_bytes, data) SELECT sim_id, kind, saved_at, tick, sim_time, day, population, format, state_version, state_shape, app_version, encoding, raw_bytes, data FROM main.snapshots`);
  let n = 0;
  const ids = mergeAttached(db, () => `new-${++n}`, 9);
  assert.deepEqual(ids, ['new-1']);
  assert.deepEqual(listSims(db).map(s => s.name).sort(), ['Mine', 'Mine (imported)']);
  assert.equal(listSnapshots(db, 'new-1').length, 1);
  assert.equal(listSnapshots(db, 'a').length, 1);
});

test('an accepted older parameter set is remembered per simulation and forgotten on delete', () => {
  const { db } = open();
  createSim(db, sim('a'), 1); createSim(db, sim('b'), 1);
  setMeta(db, paramsAcceptedKey('a'), 'reg-2'); setMeta(db, paramsAcceptedKey('b'), 'reg-2');
  assert.equal(getMeta(db, paramsAcceptedKey('a')), 'reg-2');
  deleteSim(db, 'a');
  assert.equal(getMeta(db, paramsAcceptedKey('a')), null);
  assert.equal(getMeta(db, paramsAcceptedKey('b')), 'reg-2');
});
