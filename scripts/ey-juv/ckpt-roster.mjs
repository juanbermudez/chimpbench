// EY juvenile starvation (docs/staging/ey-juvenile-starvation.md): the roster of a saved e-bench checkpoint, read only.
// Decodes the checkpoint as scripts/lib/checkpoint.ts writes it (gzip of [MAGIC][u32 header length][header JSON][v8 payload])
// and prints one JSON line per run: every animal's identity, age, mother, community, weaning state and energy books at the
// checkpoint, the dead with their time and cause, and each community's size. No simulation, no src/ import.
//
//   node scripts/ey-juv/ckpt-roster.mjs <ckpt.v8.gz> [<ckpt.v8.gz> …] > artifacts/validation/ey-juv/roster.jsonl
import { readFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { gunzipSync } from 'node:zlib';

const MAGIC = Buffer.from('CHIMPBENCH-CKPT 1\n');
for (const file of process.argv.slice(2)) {
  const raw = gunzipSync(readFileSync(file));
  if (!raw.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error(`${file} is not a ChimpBench checkpoint`);
  const n = raw.readUInt32BE(MAGIC.length), h0 = MAGIC.length + 4;
  const header = JSON.parse(raw.subarray(h0, h0 + n).toString('utf8'));
  const w = deserialize(raw.subarray(h0 + n)).world;
  const chimps = w.chimps.map(c => {
    const x = c.sim, L = x?.en;
    return {
      id: c.id, name: c.name, sex: c.sex, age: c.age, alive: c.alive, troop: c.troopId, mother: c.motherId, stage: c.stage,
      pregnancy: c.pregnancy, lactating: c.lactating, health: c.health, hunger: c.hunger,
      deathTime: c.deathTime ?? null, cause: c.causeOfDeath ?? null,
      weaned: x ? x.weaned : null, weanAge: x ? x.weanAge : null, cond: x ? x.cond : null, immigrantAge: x ? x.immigrantAge : null,
      res: L ? L.res : null, kg: L ? (L.kg ?? null) : null, gut: L ? L.gut : null, dm: L ? (L.dm ?? null) : null, eAvg: L ? (L.eAvg ?? null) : null, mAvg: L ? (L.mAvg ?? null) : null,
    };
  });
  const troops = w.troops.map(t => ({ id: t.id, name: t.name, radius: t.radius, center: t.center, living: w.chimps.filter(c => c.alive && c.troopId === t.id).length }));
  process.stdout.write(JSON.stringify({ file, label: file.split('/').pop().replace(/\.s\d+\.ckpt.*$/, ''), seed: header.seed, day: header.day, scoredDays: header.scoredDays,
    pithFibreSwallowed: header.settings.params.pithFibreSwallowed, rngSalt: header.settings.params.rngSalt ?? 0, time: w.time, ageRate: w.ageRate, worldSeed: w.seed, chimps, troops }) + '\n');
}
