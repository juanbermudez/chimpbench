import assert from 'node:assert/strict';
import test from 'node:test';
import { ownDrive } from '../src/sim/energy';
import { executeAction, nurseTap, type NurseEvent } from '../src/sim/execution';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E1n (weanDecide; docs/staging/e1n-prereg.md §3): the mother decides when milk leaves the gland, by her own drive
// against her infant's own-food drive, in place of the weaning roll; a sleeping mother makes no decision.

const STACK = { energyLedger: 1, ledgerDrive: 1, ledgerDigesta: 1, ledgerGrowSurplus: 1, ledgerGrowPotential: 1, ledgerInfantIntake: 1, ledgerNightNurse: 1, ledgerNurseBout: 1, rhythmSleep: 1 };
const ROLL = ['weanRefuseMaxP', 'weanRefuseAgeY', 'weanRefuseRampY'];

test('weanDecide is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).weanDecide, 0);
});

// one field world on the ledger stack with the switch on, run a day (shared by the tests below)
const day = (() => {
  let w: World | null = null, read: Set<string> | null = null, events: NurseEvent[] = [];
  return () => {
    if (!w) {
      w = createWorld(48, { profile: 'field', params: { ...STACK, weanDecide: 1 } });
      read = new Set<string>(); traceParamReads(w, read);
      events = []; nurseTap.fn = (_c, _m, ev) => { events.push(ev); };
      for (let i = 0; i < 5760; i++) tickWorld(w);
      nurseTap.fn = null;
    }
    return { w, read: read!, events };
  };
})();

test('weanDecide on (field, ledger stack): deterministic over a day; the weaning roll is never read; bouts still start', () => {
  const { w, read, events } = day();
  const b = createWorld(48, { profile: 'field', params: { ...STACK, weanDecide: 1 } });
  for (let i = 0; i < 5760; i++) tickWorld(b);
  assert.equal(worldHash(w), worldHash(b));
  for (const id of ROLL) assert.ok(!read.has(id), `${id} is not read`);
  assert.ok(events.includes('start'), 'nursing bouts start');
  assert.ok(!events.includes('refuse-roll'), 'the roll never refuses');
});

/** An unweaned infant of 1–4 y with its living, awake mother, from the day's world (a copy, so the shared world is unchanged). */
function dyad(): { w: World; c: Chimp; m: Chimp } {
  const w = JSON.parse(JSON.stringify(day().w)) as World;
  const idx = index(w);
  for (const c of idx.alive) {
    const m = c.motherId >= 0 ? idx.byId.get(c.motherId) : undefined;
    if (c.age >= 1 && c.age < 4 && !ix(c).weaned && m && m.alive && ix(c).en && ix(m).en) {
      m.action = 'rest'; m.targetId = -1; // awake, out of the nest
      c.position = [m.position[0], m.position[1], m.position[2]];
      c.action = 'nurse'; c.targetId = m.id; ix(c).phase = 0; ix(c).prog = 0;
      return { w, c, m };
    }
  }
  throw new Error('no unweaned infant of 1–4 y with its mother on seed 48');
}

test('ownDrive is pure and lies in [0, 1]', () => {
  const { w, c } = dyad();
  const before = worldHash(w), d = ownDrive(c, paramsOf(w));
  assert.ok(d >= 0 && d <= 1, `ownDrive ${d}`);
  assert.equal(worldHash(w), before);
});

test('the awake mother refuses when her drive exceeds the infant\'s own-food drive, and lets the bout start otherwise', () => {
  const run = (hunger: number): NurseEvent[] => {
    const { w, c, m } = dyad();
    m.hunger = hunger;
    const ev: NurseEvent[] = []; nurseTap.fn = (_c, _m, e) => { ev.push(e); };
    try { executeAction(w, c); } finally { nurseTap.fn = null; }
    return ev;
  };
  const { w, c } = dyad(), own = ownDrive(c, paramsOf(w));
  assert.ok(own < 1, `the infant's own-food drive is below 1 (${own})`);
  assert.deepEqual(run(0), ['start']);
  assert.deepEqual(run(1), ['refuse-mother']);
});

test('a sleeping mother makes no decision (in her finished nest, rhythmCircadian off): the bout starts whatever her drive', () => {
  const { w, c, m } = dyad();
  m.hunger = 1; m.action = 'nest'; ix(m).phase = 2;
  const ev: NurseEvent[] = []; nurseTap.fn = (_c, _m, e) => { ev.push(e); };
  try { executeAction(w, c); } finally { nurseTap.fn = null; }
  assert.deepEqual(ev, ['start']);
});
