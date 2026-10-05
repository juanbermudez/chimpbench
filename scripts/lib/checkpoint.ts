// Checkpoints of a running e-bench seed (track E, part E2: the 6 → 12 → 24-month ladder extends a run instead of
// re-simulating it). One file holds the whole run state: the world, the field observer's three team sets, the trial
// RNG and every readout's state (viability, energy, rhythm), serialized together with node:v8 (the structured-clone
// format) so the references between them survive: the observer's open interactions and party members are the world's
// own objects, and the energy readout's mothers are chimps of the same world. A JSON round trip would break them.
//
// Format: gzip of [MAGIC][u32 header length][header JSON][v8 payload]; then a sidecar `<file minus .v8.gz>.json` with the
// same header and the byte counts, written last (its presence means the checkpoint is complete). Both are written to a
// temporary name and renamed. The observer's growable columns (src/field/records.ts Column) are the only class
// instances in the state: v8 keeps their data but not their prototype, so restoreColumns() puts it back.
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, writeSync } from 'node:fs';
import { deserialize, serialize } from 'node:v8';
import { gunzipSync, gzipSync } from 'node:zlib';
import { Column, type Records } from '../../src/field/records';
import type { Observer } from '../../src/field/observer';

const MAGIC = Buffer.from('CHIMPBENCH-CKPT 1\n');

/** Writes `data` to `file` through a temporary name and a rename, so a reader never sees half a file. */
export function writeAtomic(file: string, data: Buffer | string): void {
  const tmp = `${file}.tmp-${process.pid}`;
  const fd = openSync(tmp, 'w');
  try { writeSync(fd, typeof data === 'string' ? Buffer.from(data) : data); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(tmp, file);
}

/** The sidecar of a checkpoint file. */
export const sidecarOf = (file: string) => file.replace(/\.v8\.gz$/, '') + '.json';

/** Writes a checkpoint and its sidecar; returns the sizes. */
export function writeCheckpoint(file: string, header: Record<string, unknown>, state: unknown): { bytes: number; rawBytes: number } {
  if (!file.endsWith('.v8.gz')) throw new Error(`checkpoint file must end in .v8.gz: ${file}`);
  const payload = serialize(state), head = Buffer.from(JSON.stringify(header));
  const len = Buffer.alloc(4); len.writeUInt32BE(head.length);
  const raw = Buffer.concat([MAGIC, len, head, payload]);
  const gz = gzipSync(raw, { level: 1 });
  writeAtomic(file, gz);
  writeAtomic(sidecarOf(file), JSON.stringify({ ...header, file, bytes: gz.length, rawBytes: raw.length }, null, 1) + '\n');
  return { bytes: gz.length, rawBytes: raw.length };
}

/** Reads a checkpoint written by writeCheckpoint (the sidecar must exist: a checkpoint without one is incomplete). */
export function readCheckpoint<S>(file: string): { header: Record<string, unknown>; state: S } {
  if (!existsSync(file)) throw new Error(`no checkpoint at ${file}`);
  if (!existsSync(sidecarOf(file))) throw new Error(`checkpoint ${file} is incomplete (no sidecar ${sidecarOf(file)})`);
  const raw = gunzipSync(readFileSync(file));
  if (!raw.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error(`${file} is not a ChimpBench checkpoint`);
  const n = raw.readUInt32BE(MAGIC.length), h0 = MAGIC.length + 4;
  const header = JSON.parse(raw.subarray(h0, h0 + n).toString('utf8')) as Record<string, unknown>;
  const state = deserialize(raw.subarray(h0 + n)) as S;
  return { header, state };
}

/** Puts the Column prototype back on an observer's columnar tables after deserialization (the only class instances). */
export function restoreColumns(o: Observer | null | undefined): void {
  if (!o) return;
  const rec = o.rec as Records;
  for (const table of [rec.points, rec.scans] as unknown as Record<string, unknown>[]) for (const v of Object.values(table)) {
    if (!(v instanceof Column)) Object.setPrototypeOf(v, Column.prototype);
  }
}
