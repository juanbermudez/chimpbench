import assert from 'node:assert/strict';
import test from 'node:test';
import { applyIntervention, createWorld, tickWorld } from '../src/simulation';
import { perceive } from '../src/sim/perception';
import { ix, simOf } from '../src/sim/state';
import { paramsOf } from '../src/sim/params';
import type { Chimp, World } from '../src/types';

const runTo = (w: World, hour: number) => { while (w.time < hour - 6.5 - 1e-9) tickWorld(w); };
const byId = (w: World, id: number) => w.chimps.find(c => c.id === id)!;

/** Leaves only `party` near a point on West's boundary facing North; everyone else of West goes to the far side. */
function stage(w: World, party: Chimp[]): { at: [number, number]; speaker: [number, number] } {
  const west = w.troops[0], north = w.troops[2];
  let dx = north.center[0] - west.center[0], dz = north.center[2] - west.center[2];
  const l = Math.hypot(dx, dz); dx /= l; dz /= l;
  const at: [number, number] = [west.center[0] + dx * 20, west.center[2] + dz * 20];
  const far: [number, number] = [west.center[0] - dx * 25, west.center[2] - dz * 25];
  for (const c of w.chimps) {
    if (!c.alive) continue;
    const inParty = party.includes(c) || party.some(p => p.id === c.motherId && c.age < 5);
    if (c.troopId === west.id && !inParty) c.position = [far[0] + (c.id % 5) - 2, 0, far[1] + (c.id % 3) - 1];
    if (inParty) {
      c.position = [at[0] + (c.id % 3) - 1, 0, at[1] + (c.id % 2)];
      c.hunger = 0.15; c.energy = 0.9; c.nest = null; c.action = 'rest'; c.targetId = -1; c.injury = 0;
    }
  }
  for (const c of w.chimps) if (c.alive) perceive(w, c);
  return { at, speaker: [at[0] + dx * 18, at[1] + dz * 18] };
}
const meanDist = (cs: Chimp[], p: [number, number]) => cs.reduce((a, c) => a + Math.hypot(c.position[0] - p[0], c.position[2] - p[1]), 0) / cs.length;

test('playback: a party with >=3 adult males approaches and calls back (numerical assessment)', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const west = w.troops[0];
  const males = west.maleHierarchy.slice(0, 4).map(id => byId(w, id));
  const { at, speaker } = stage(w, males);
  const before = meanDist(males, speaker);
  // position is the observer's focus; the protocol puts the speaker ~18 m further out
  const st = applyIntervention(w, 'playback-stranger', { troopId: west.id, position: [at[0], 0, at[1]] });
  assert.ok(st && st.kind === 'playback-stranger' && st.radius >= 25);
  assert.ok(Math.hypot(st.position[0] - speaker[0], st.position[2] - speaker[1]) < 0.5, 'speaker placed 18 m outward from the focus');
  for (const m of males) assert.equal(ix(m).heardN, 1);
  tickWorld(w); tickWorld(w);
  const responses = males.map(m => m.action);
  assert.ok(responses.filter(a => a === 'patrol' || a === 'call').length >= 3, `responses ${responses}`);
  for (let i = 0; i < 24; i++) tickWorld(w);
  assert.ok(meanDist(males, speaker) < before - 4, 'approached the speaker');
  assert.ok(w.calls.some(c => c.kind === 'pant-hoot' && males.some(m => m.id === c.callerId)) || simOf(w).patrols[west.id] !== null);
});

test('playback: an outnumbered party retreats silently', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const west = w.troops[0];
  const male = byId(w, west.maleHierarchy[4]);
  const females = w.chimps.filter(c => c.troopId === west.id && c.sex === 'female' && c.age >= 15 && !c.lactating).slice(0, 2);
  const party = [male, ...females];
  const { at, speaker } = stage(w, party);
  const before = meanDist(party, speaker);
  applyIntervention(w, 'playback-stranger', { troopId: west.id, position: [at[0], 0, at[1]] });
  tickWorld(w); tickWorld(w);
  assert.ok(party.filter(c => c.action === 'flee').length >= 2, `responses ${party.map(c => c.action)}`);
  const callsBefore = w.calls.filter(c => party.some(p => p.id === c.callerId) && c.kind === 'pant-hoot').length;
  for (let i = 0; i < 12; i++) tickWorld(w);
  assert.ok(meanDist(party, speaker) > before + 3, 'moved away');
  assert.equal(w.calls.filter(c => party.some(p => p.id === c.callerId) && c.kind === 'pant-hoot').length, callsBefore, 'stayed silent');
});

test('a lone stranger facing several adult males is chased; it flees', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const west = w.troops[0];
  const males = west.maleHierarchy.slice(0, 4).map(id => byId(w, id));
  const { at } = stage(w, males);
  const lone = byId(w, w.troops[1].maleHierarchy[3]);
  lone.position = [at[0] + 12, 0, at[1]]; lone.nest = null; lone.hunger = 0.2; lone.action = 'rest';
  for (let i = 0; i < 16; i++) tickWorld(w);
  assert.ok(w.stats.intergroupEncounters >= 1);
  assert.ok(males.some(m => ix(m).lastAgg > w.time - 0.1) || w.interactions.some(i => (i.kind === 'intergroup' || i.kind === 'fight' || i.kind === 'kill') && i.targetId === lone.id));
  assert.ok(!lone.alive || lone.action === 'flee' || ix(lone).victimAt > w.time - 0.1);
});

test('stimuli are perceived locally: only chimps near a snake know about it', () => {
  const w = createWorld(48);
  runTo(w, 10);
  const st = applyIntervention(w, 'snake-model', { troopId: 2 })!;
  assert.ok(st && st.radius > 0);
  for (let i = 0; i < 4; i++) tickWorld(w);
  const aware = simOf(w).aware[st.id] ?? [];
  for (const id of aware) {
    const c = byId(w, id);
    assert.ok(Math.hypot(c.position[0] - st.position[0], c.position[2] - st.position[2]) < 60, 'aware chimps were near or heard an alarm');
  }
  const far = w.chimps.filter(c => c.alive && Math.hypot(c.position[0] - st.position[0], c.position[2] - st.position[2]) > 60);
  assert.ok(far.length > 5 && far.every(c => !ix(c).stims.includes(st.id)));
});

// ---------------------------------------------------------------------------
// Stage C6: living territories and grounded patrols (docs/realism-design.md §5.2–5.3)
// ---------------------------------------------------------------------------

test('UD: daytime party use adds independent members × Δt to the party cell; isopleths and the range follow the use', async () => {
  const { cellAt, dailyTerritory, gridOf, levels, recordUse } = await import('../src/sim/territory');
  const w = createWorld(48, { params: { rgOn: 0, intakeValue: 0 } }); // the recorded scenario (pre-C13)
  runTo(w, 12); // midday: daylight, parties awake
  const s = simOf(w), g = gridOf(w, paramsOf(w)), west = w.troops[0];
  s.ud[west.id] = new Array(g.n * g.n).fill(0); s.udNew[west.id] = {};
  // a constructed track: one West party parked at two places, three times as long at the first
  const p = w.parties.find(q => q.troopId === west.id && q.kind !== 'nesting')!;
  const ind = p.members.filter(id => { const c = byId(w, id); return ix(c).weaned || c.age >= 6; }).length;
  const a: [number, number] = [west.center[0] + 6, west.center[2]], b: [number, number] = [west.center[0] - 12, west.center[2] + 8];
  for (let k = 0; k < 4; k++) { p.center = k < 3 ? [a[0], 0, a[1]] : [b[0], 0, b[1]]; recordUse(w, 0.5); }
  const ka = cellAt(g, a[0], a[1]), kb = cellAt(g, b[0], b[1]);
  assert.ok(Math.abs(s.udNew[west.id][ka] - 1.5 * ind) < 1e-9 && Math.abs(s.udNew[west.id][kb] - 0.5 * ind) < 1e-9);
  assert.equal(s.ud[west.id][ka], 0, 'the day\'s use is merged at the daily update, so isopleths depend only on saved state');
  dailyTerritory(w);
  assert.ok(Math.abs(s.ud[west.id][ka] - 1.5 * ind) < 1e-9 && Object.keys(s.udNew[west.id]).length === 0);
  const L = levels(w)[west.id];
  assert.ok(L[ka] < L[kb] && L[kb] <= 1, 'the busier cell is inside the lower isopleth');
  assert.ok(west.range && west.range.cells.includes(ka) && west.range.core.includes(ka));
  assert.ok(Math.hypot(west.center[0] - a[0], west.center[2] - a[1]) < Math.hypot(west.center[0] - b[0], west.center[2] - b[1]), 'the centre moves toward the busier place');
  // night use and nesting parties do not count
  runTo(w, 24 + 23);
  const before = s.udNew[west.id][ka] ?? 0;
  p.center = [a[0], 0, a[1]]; recordUse(w, 0.5);
  assert.equal(s.udNew[west.id][ka] ?? 0, before);
});

test('danger: retreating from strangers is a loss in the animal\'s own contact memory (§5.3.1 P2), not the community\'s', async () => {
  const { lossAt } = await import('../src/sim/contact');
  const { candidateMeta, V } = await import('../src/sim/candidates');
  const { startAction } = await import('../src/sim/execution');
  const w = createWorld(7);
  runTo(w, 10);
  const c = w.chimps.find(q => q.alive && q.troopId === 1 && q.age >= 15)!, st = w.chimps.find(q => q.alive && q.troopId === 3 && q.age >= 15)!;
  const other = w.chimps.find(q => q.alive && q.troopId === 1 && q.age >= 15 && q !== c)!;
  const P = paramsOf(w), [x, z] = [c.position[0], c.position[2]];
  const before = lossAt(w, c, x, z, P), otherBefore = lossAt(w, other, x, z, P);
  const cand = { action: 'flee' as const, targetId: st.id, score: 1, reason: 'test' };
  candidateMeta.set(cand, { v: V.STRANGERS, aux: -1 });
  startAction(w, c, cand, 'rules');
  assert.ok(lossAt(w, c, x, z, P) > before);
  assert.equal(lossAt(w, other, x, z, P), otherBefore, 'others learn only by travelling with it');
});

test('patrol hazard: only adult males with at least three adult males in view roll it, within the patrol window', async () => {
  const { IMPULSE_PATROL } = await import('../src/sim/perception');
  const w = createWorld(48, { params: { patrolH0: 100, patrolStaleTauDays: 0.01 } });
  runTo(w, 10);
  const west = w.chimps.filter(c => c.alive && c.troopId === 1);
  const males = west.filter(c => c.sex === 'male' && c.age >= 15), others = west.filter(c => !(c.sex === 'male' && c.age >= 15));
  stage(w, males);
  simOf(w).patrols = {}; w.environment.rain = 0;
  for (const c of [...males, ...others]) { ix(c).impulse = 0; ix(c).impulseUntil = -1e9; ix(c).patrolRoll = w.time - 1; perceive(w, c); }
  assert.ok(males.some(c => ix(c).impulse === IMPULSE_PATROL), 'an eligible male starts a patrol');
  assert.ok(others.every(c => ix(c).impulse !== IMPULSE_PATROL), 'females and immatures never roll it');
  // outside 08:00–15:30 nobody rolls it
  runTo(w, 24 + 17);
  stage(w, males);
  for (const c of males) { ix(c).impulse = 0; ix(c).impulseUntil = -1e9; ix(c).patrolRoll = w.time - 1; perceive(w, c); }
  assert.ok(males.every(c => ix(c).impulse !== IMPULSE_PATROL));
});

test('patrols stop to listen, and an incursion stays inside the neighbour\'s range', async () => {
  const { incursionPoint, useLevels, gridOf, cellAt, rangeEdge, sectorDir, stalestSector } = await import('../src/sim/territory');
  const w = createWorld(21, { profile: 'field' });
  const west = w.troops[0], north = w.troops[2], L = useLevels(w), g = gridOf(w, paramsOf(w));
  const [dx, dz] = sectorDir(stalestSector(w, west).sector);
  const edge = rangeEdge(w, west, dx, dz);
  for (let salt = 0; salt < 20; salt++) {
    const [x, z] = incursionPoint(w, north, edge[0], edge[1], salt);
    assert.ok(L[north.id][cellAt(g, x, z)] <= 0.95, `incursion ${salt} inside North's range`);
  }
  // a whole patrol: stops recorded on the patrol state
  const c = createWorld(48, { params: { patrolH0: 50 } });
  let stops = 0;
  for (let i = 0; i < 5760 * 3 && stops < 2; i++) { tickWorld(c); for (const t of c.troops) { const p = simOf(c).patrols[t.id]; if (p) stops = Math.max(stops, p.stops); } }
  assert.ok(stops >= 2, `a patrol made ${stops} listening stops`);
});

test('no scripted range shifts remain', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const dir = new URL('../src/sim/', import.meta.url);
  for (const f of readdirSync(dir)) if (f.endsWith('.ts')) assert.ok(!/shiftRange|rangeRelaxPerDay/.test(readFileSync(new URL(f, dir), 'utf8')), f);
});

test('C7a review: familiarFullLevel sets where the familiarity cost starts (0.95 field: none inside the range; 0.5: from the core outward)', async () => {
  const { territoryCost, gridOf, cellAt } = await import('../src/sim/territory');
  const w = createWorld(21, { profile: 'field' });
  const P = paramsOf(w), g = gridOf(w, P), c = w.chimps.find(ch => ch.alive && ch.troopId === 1 && ch.age >= 20 && ch.natalTroopId === 1)!;
  const n = g.n * g.n, own = new Float32Array(n).fill(1), k = cellAt(g, c.position[0], c.position[2]);
  own[k] = 0.8; // inside the 95% isopleth, outside the 50% core
  const lv = { [c.troopId]: own } as Record<number, Float32Array>;
  const at = (full: number) => territoryCost(w, c, c.position[0], c.position[2], { ...P, familiarFullLevel: full, territoryCostB: 0 }, lv, g);
  assert.equal(P.familiarFullLevel, 0.95);
  assert.equal(at(0.95), 0);
  assert.ok(Math.abs(at(0.5) - P.territoryCostA * (1 - (P.udOuterLevel - 0.8) / (P.udOuterLevel - 0.5))) < 1e-6, `${at(0.5)}`);
});
