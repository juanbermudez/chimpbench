import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidates } from '../src/sim/candidates';
import { ledgerOf, reserveCap } from '../src/sim/energy';
import { netRateShare } from '../src/sim/intake';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E3c (forageRate; docs/staging/e3c-prereg.md §5): every feeding option is worth the crown's drive (1.6 h + 0.1)
// times the net energy rate it promises as a share of the animal's own full ripe-fruit rate (intake.ts netRateShare): a
// bout's energy less the walk's and the climb's cost, over the walk and the eating. The crop shape, forageDistScaleM,
// fallbackForageW, memTravelHungerW and the trips' tripCost are not read.

const LEDGER = { energyLedger: 1, ledgerDigesta: 1, ledgerDrive: 1, ledgerFoodEnergyFix: 1, rhythmSleep: 1, cohesionValue: 1 };
const REPLACED = ['forageDistScaleM', 'fallbackForageW', 'memTravelHungerW'];

test('forageRate is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).forageRate, 0);
});

test('forageRate on (field): deterministic over a day; the replaced weights and the crop shape are not read', () => {
  const T = { ...LEDGER, forageRate: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  let feeding = 0;
  for (let i = 0; i < 5760; i++) {
    tickWorld(a); tickWorld(b);
    if (i % 31 === 0) for (const c of index(a).alive) if (c.action === 'forage' && ix(c).phase >= 2) feeding++;
  }
  assert.equal(worldHash(a), worldHash(b));
  for (const id of [...REPLACED, 'fruitValueRef']) assert.ok(!read.has(id), `${id} is not read`);
  for (const id of ['ledgerWalkJPerKgM', 'ledgerClimbEff', 'walkMps']) assert.ok(read.has(id), `${id} is read`);
  assert.ok(feeding > 0, `animals feed (${feeding} samples)`);
});

test('forageRate removes the three fitted weights from the prescription count', () => {
  assert.equal(prescriptionCount({ ...LEDGER, forageRate: 1 }).total, prescriptionCount(LEDGER).total - 3);
});

// A field world after a day (the ledger on), one adult female next to the largest drupe crop; the scores under a setting.
const snapshot = (() => { let s = ''; return (): World => { if (!s) { const w = createWorld(48, { profile: 'field', params: LEDGER }); for (let i = 0; i < 5760 + 600; i++) tickWorld(w); s = JSON.stringify(w); } return JSON.parse(s) as World; }; })();

function scene(over: Record<string, number>, opts: { distM?: number; cropScale?: number; reservesRel?: number } = {}) {
  const w = snapshot();
  const settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...over };
  const P = paramsOf(w);
  const c = w.chimps.find(x => x.alive && x.age >= 15 && x.sex === 'female' && !x.lactating && x.action !== 'nest')!;
  const t = w.trees.filter(q => q.common !== 'fig').reduce((a, q) => fruitAt(w, q) > fruitAt(w, a) ? q : a);
  c.position = [t.position[0] + (opts.distM ?? 3), 0, t.position[2]];
  c.action = 'rest'; c.targetId = -1; c.hunger = 0.6;
  if (opts.cropScale !== undefined) t.depletion = [fruitAt(w, t) * (1 - opts.cropScale), w.time];
  if (opts.reservesRel !== undefined) ledgerOf(c, P).res = opts.reservesRel * reserveCap(c, P);
  const x = ix(c); x.trees = [t.id]; x.seen = []; x.fedTree = []; x.fedAt = [];
  const out: Candidate[] = [];
  computeCandidates(w, c, out);
  return { w, c, t, P, crown: out.find(q => q.action === 'forage' && q.targetId === t.id), fallback: out.find(q => q.action === 'forage' && q.targetId === -1) };
}

test('forageRate: a crown is worth the drive times its net rate, whatever forageDistScaleM says; off, the distance scale is read', () => {
  const on = scene({ forageRate: 1 }), on2 = scene({ forageRate: 1, forageDistScaleM: 40 });
  assert.ok(on.crown && on2.crown);
  assert.equal(on.crown!.score, on2.crown!.score, 'on: forageDistScaleM has no effect');
  const off = scene({ forageRate: 0 }, { distM: 20 }), off2 = scene({ forageRate: 0, forageDistScaleM: 40 }, { distM: 20 });
  assert.ok(off2.crown!.score < off.crown!.score, 'off: a shorter distance scale lowers the crown');
  const r = netRateShare(on.c, on.P, fruitAt(on.w, on.t), 0, 3, on.t.height * (0.45 + 0.28 / 2));
  assert.ok(r > 0.9 && r <= 1, `a crown 3 m away delivers nearly the full rate (${r})`);
});

test('forageRate: a farther crown is worth less (the walk), and a crown is worth the same whatever its crop beyond one bout', () => {
  const near = scene({ forageRate: 1 }, { distM: 3 }), far = scene({ forageRate: 1 }, { distM: 30 });
  assert.ok(far.crown!.score < near.crown!.score, `${far.crown!.score} < ${near.crown!.score}`);
  const rFull = netRateShare(near.c, near.P, 1, 0, 200, 10), rHalf = netRateShare(near.c, near.P, 0.5, 0, 200, 10), rTiny = netRateShare(near.c, near.P, 0.005, 0, 200, 10);
  assert.ok(Math.abs(rFull - rHalf) < 1e-12, 'a crop beyond one bout adds nothing to the rate');
  assert.ok(rTiny < rHalf, 'a crop below one bout lowers it (the walk is shared by less food)');
  assert.ok(netRateShare(near.c, near.P, 0.5, 3, 200, 10) <= rHalf, 'co-feeders take their share');
});

test('forageRate: the rate is the same whatever the animal\'s reserves (its need decides whether it forages, not where)', () => {
  const lean = scene({ forageRate: 1 }, { reservesRel: -0.2 }), fat = scene({ forageRate: 1 }, { reservesRel: 0.1 });
  const a = netRateShare(lean.c, lean.P, 0.5, 0, 150, 10), b = netRateShare(fat.c, fat.P, 0.5, 0, 150, 10);
  assert.ok(Math.abs(a - b) < 1e-12, `${a} = ${b}`);
});

test('forageRate: the fallback is valued at its own rate with the crown\'s drive (fallbackForageW not read); off, it is', () => {
  const on = scene({ forageRate: 1 }), on2 = scene({ forageRate: 1, fallbackForageW: 0.1 });
  assert.ok(on.fallback && on2.fallback);
  assert.equal(on.fallback!.score, on2.fallback!.score);
  const off = scene({ forageRate: 0 }), off2 = scene({ forageRate: 0, fallbackForageW: 0.1 });
  assert.ok(off2.fallback!.score < off.fallback!.score);
});
