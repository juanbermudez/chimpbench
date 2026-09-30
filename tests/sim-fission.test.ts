import assert from 'node:assert/strict';
import test from 'node:test';
import { bestTwoSplit, DAUGHTER_COLORS, DAUGHTER_EMBLEMS, fissionStep, modularity } from '../src/sim/fission';
import { hash01 } from '../src/sim/rng';
import { index, simOf } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { canonical, fnv } from './fixtures/golden';

// Stage C9 (docs/realism-design.md "C9 pre-registration").

const block = (sizes: number[], within: number, between: number) => {
  const n = sizes.reduce((a, b) => a + b, 0), lab: number[] = [];
  sizes.forEach((s, k) => { for (let i = 0; i < s; i++) lab.push(k); });
  const w = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) w[i][j] = w[j][i] = (lab[i] === lab[j] ? within : between) * (0.8 + 0.4 * hash01(i, j, 3));
  return { w, lab };
};

test('detection recovers a planted two-group partition; a single cohesive group gives low modularity', () => {
  const { w, lab } = block([9, 7], 0.5, 0.04);
  const r = bestTwoSplit(w);
  const agree = r.labels.every((l, i) => (l === r.labels[0]) === (lab[i] === lab[0]));
  assert.ok(agree, `${r.labels}`);
  assert.ok(r.Q > 0.35 && Math.abs(r.Q - modularity(w, r.labels)) < 1e-12, `Q ${r.Q}`);
  const one = block([16], 0.5, 0).w;
  assert.ok(bestTwoSplit(one).Q < 0.1, `cohesive Q ${bestTwoSplit(one).Q}`);
  // weak structure (a network starting to divide): still a positive best two-way split, mostly along the planted line
  const weak = block([8, 8], 0.5, 0.33), rw = bestTwoSplit(weak.w);
  const hits = rw.labels.filter((l, i) => (l === rw.labels[0]) === (weak.lab[i] === weak.lab[0])).length;
  assert.ok(rw.Q > 0 && hits >= 13, `weak Q ${rw.Q}, ${hits}/16`);
  // three planted groups are merged to the best two
  const three = block([6, 6, 6], 0.5, 0.02).w;
  assert.equal(new Set(bestTwoSplit(three).labels).size, 2);
});

/** Crafts association data for community `troop` as two clusters and runs the monthly step `months` times. */
function craft(w: World, troop: number, separate: boolean, months: number) {
  const s = simOf(w), members = index(w).alive.filter(c => c.troopId === troop && c.age >= 10).sort((a, b) => a.id - b.id);
  const males = members.filter(c => c.sex === 'male'), females = members.filter(c => c.sex === 'female');
  const A = [...males.filter((_, i) => i % 2 === 0), ...females.filter((_, i) => i % 2 === 0)].map(c => c.id), B = members.map(c => c.id).filter(id => !A.includes(id));
  s.fission = { pairs: {}, scans: {}, hist: {}, lastMonth: Math.floor(w.time / 730), run: {}, log: [], parents: {} };
  const f = s.fission;
  const setAll = () => {
    for (const id of [...A, ...B]) { f.scans[id] = 5000; f.hist[id] = { [A.includes(id) || !separate ? 11 : 99]: 5000 }; }
    for (const a of [...A, ...B]) for (const b of [...A, ...B]) if (a < b) f.pairs[a * 100000 + b] = A.includes(a) === A.includes(b) ? 3000 : 60;
  };
  for (let m = 0; m < months; m++) { setAll(); w.time += 731; fissionStep(w); }
  return { A, B, members };
}

test('a split: after 12 qualifying months the farther cluster becomes a new community; individuals, mothers, bonds and range use are conserved', () => {
  const w = createWorld(48, { params: { fissionOn: 1 } });
  for (let i = 0; i < 200; i++) tickWorld(w);
  const west = w.troops[0], before = index(w).alive.filter(c => c.troopId === west.id);
  const alive0 = index(w).alive.length, bonds0 = JSON.stringify(before.map(c => c.bonds)), ud0 = simOf(w).ud[west.id].reduce((a, b) => a + b, 0);
  craft(w, west.id, true, 11);
  assert.equal(w.troops.length, 3, 'no split before 12 months');
  craft(w, west.id, true, 12);
  assert.equal(w.troops.length, 4, 'split after 12 months');
  const d = w.troops[3], f = simOf(w).fission!;
  assert.equal(d.color, DAUGHTER_COLORS[0]); assert.equal(d.emblem, DAUGHTER_EMBLEMS[0]); assert.equal(d.name, `${west.name} (new)`);
  assert.equal(f.parents[d.id], west.id);
  const now = index(w).alive, stay = now.filter(c => c.troopId === west.id), left = now.filter(c => c.troopId === d.id);
  assert.equal(now.length, alive0);
  assert.equal(stay.length + left.length, before.length);
  assert.ok(stay.length >= 6 && left.length >= 6);
  for (const c of now) { const m = now.find(x => x.id === c.motherId); if (m && c.age < 10 && (m.troopId === west.id || m.troopId === d.id)) assert.equal(c.troopId, m.troopId, `${c.name} goes with its mother`); }
  assert.equal(JSON.stringify(before.map(c => c.bonds)), bonds0, 'bonds kept');
  const ud1 = simOf(w).ud[west.id].reduce((a, b) => a + b, 0) + simOf(w).ud[d.id].reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(ud1 - ud0) < 1e-3 * Math.max(1, ud0), `use ${ud0} -> ${ud1}`);
  for (let i = 0; i < 300; i++) tickWorld(w); // the world runs on with four communities
  assert.ok(d.maleHierarchy.length + d.femaleHierarchy.length > 0, 'the daughter has a hierarchy');
  assert.ok(d.range && d.radius > 0);
});

test('no split while the clusters share their range, or when a cluster lacks three adults of a sex', () => {
  const w = createWorld(48, { params: { fissionOn: 1 } });
  for (let i = 0; i < 200; i++) tickWorld(w);
  craft(w, w.troops[0].id, false, 14);
  assert.equal(w.troops.length, 3);
  const f = simOf(w).fission!;
  assert.ok(f.log.length > 0 && f.log.every(r => !r.met || r.overlap <= 0.5));
  const v = createWorld(48, { params: { fissionOn: 1, fissionMinAdults: 30 } });
  for (let i = 0; i < 200; i++) tickWorld(v);
  craft(v, v.troops[0].id, true, 14);
  assert.equal(v.troops.length, 3);
});

test('fissionOn 0 writes no state; with it on, runs are deterministic and resume from JSON exactly', () => {
  const off = createWorld(7);
  for (let i = 0; i < 3000; i++) tickWorld(off);
  assert.equal(simOf(off).fission, undefined);
  const make = () => createWorld(7, { params: { fissionOn: 1 } });
  const a = make(), b = make();
  for (let i = 0; i < 6000; i++) { tickWorld(a); tickWorld(b); }
  assert.ok(Object.keys(simOf(a).fission!.pairs).length > 0, 'association recorded');
  assert.equal(fnv(canonical(a)), fnv(canonical(b)));
  const copy = JSON.parse(JSON.stringify(a)) as World;
  for (let i = 0; i < 3000; i++) { tickWorld(a); tickWorld(copy); }
  assert.equal(fnv(canonical(copy)), fnv(canonical(a)));
});
