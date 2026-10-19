import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { advance, createClock, setSpeed } from '../src/clock';
import { topIndex } from '../src/kernel/decode';
import type { Kernel } from '../src/kernel/types';
import { r15Packet, type LocalPacket } from '../src/providers/packet';
import { createDecisionController, setRoster } from '../src/decision';
import { DriveLoop, fallbackReason, runDriveTicks } from '../src/drive/loop';
import { shares, TICK_MIN, WINDOW } from '../src/drive/ledger';
import { armDriveWorld, burnIn, createDriveWorld, DAY_TICKS, DRIVE_ARM, DRIVE_BURN_IN_DAYS, DRIVE_CALL_MS, DRIVE_DECODE, DRIVE_MIN_AGE, DRIVE_REFUSED_SEEDS,
  DRIVE_RESULT_LONG, DRIVE_SWITCHES, driveArmProblem, driveBase, driveParams, driveSeedRefusal, drivenIds, isDrivenAdult } from '../src/drive/world';
import { R15_PACKET_VERSION } from '../src/kernel/resource-contract';
import { worldShapeProblem } from '../src/persist/envelope';
import { createWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';
import { burnIn as r16BurnIn, LOOP_SWITCHES, R15_SWITCHES, R16, r16Params } from '../scripts/lib/r16-collect';
import { kernelArmWorld } from '../scripts/lib/r16-arms';
import { meterStart, MIN_AGE, DAY } from '../scripts/lib/r10-run';
import { runDay16, type Engine16 } from '../scripts/lib/r16-run';
import { newDecoder } from '../scripts/lib/decoder';
import { OPS } from '../scripts/lib/r16-worker';

// The app mode "Model decides for every adult" (docs/staging/app-model-drives.md), with stand-in kernels and no model.

/** R16's fake scorer's odds (scripts/lib/r16-fake-scorer.mjs): fixed weights from a hash of each option's text. */
function unit(text: string) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15; return ((h >>> 0) + 0.5) / 4294967296; }
const fakeOdds = (packet: LocalPacket) => { const w = Object.values(packet.questions.action.criteria).map(t => Math.exp(2 * unit(`r16-fake|${t}`))), s = w.reduce((a, b) => a + b, 0); return w.map(x => x / s); };
/** The same odds as an in-process kernel, answering as R16's recorded kernel does (the first maximum; the decoder draws). */
const fakeKernel: Kernel = { id: 'gliner', label: 'fake', decide(request) { const p = fakeOdds(r15Packet(request.context)); const index = topIndex(p); return { index, choice: `c${index}`, probabilities: p }; } };
const strip = (w: World) => { const c = structuredClone(w); delete c.modelPolicy.drive; return c; };

test('the mode\'s numbers are R16\'s (switches, kernel-arm settings, age, burn-in, call limit, decode, refused seeds, result name)', () => {
  assert.deepEqual({ ...DRIVE_SWITCHES }, { ...LOOP_SWITCHES, ...R15_SWITCHES });
  assert.deepEqual(driveParams(), Object.fromEntries(Object.entries(r16Params(true))));
  assert.equal(DRIVE_MIN_AGE, MIN_AGE); assert.equal(DRIVE_BURN_IN_DAYS, R16.burnInDays); assert.equal(DRIVE_CALL_MS, OPS.callMs); assert.equal(DAY_TICKS, DAY);
  assert.deepEqual({ ...DRIVE_DECODE }, { mode: 'draw', salt: 1, hold: 'act' });
  assert.deepEqual([...DRIVE_REFUSED_SEEDS].sort(), [...R16.refused, ...Object.values(R16.population), ...R16.focalSeeds].sort());
  for (const s of DRIVE_REFUSED_SEEDS) assert.match(driveSeedRefusal(s), /held by a registered stage/);
  assert.equal(driveSeedRefusal(48), '');
  assert.match(DRIVE_RESULT_LONG, /^rules-taught model on the R15 menu/);
  assert.deepEqual({ ...DRIVE_ARM }, { kernelGate: 1, kernelNoRulesPick: 0 });
});

test('a world in the mode is R16\'s population-test unit: equal to R16\'s burn-in and kernel-arm world, plus the mode\'s record', () => {
  const mine = createDriveWorld(48, 1), r16 = kernelArmWorld(r16BurnIn(48, true, 1), 0);
  assert.equal(worldHash(strip(mine)), worldHash(r16));
  assert.deepEqual(mine.modelPolicy.drive, { who: 'adults', minAge: 8, contract: R15_PACKET_VERSION, burnInDays: 1, decode: { mode: 'draw', salt: 1, hold: 'act' }, adapter: null });
  assert.equal(mine.modelPolicy.mode, 'lockstep');
  // saved and reopened: JSON-lossless, and the load-time layout check passes
  assert.equal(worldShapeProblem(JSON.parse(JSON.stringify(mine)) as World), '');
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(mine))), JSON.stringify(mine));
});

test('the app\'s loop is R16\'s day runner: one hour from one world gives equal hashes, and the readout\'s minutes equal R16\'s meter', async () => {
  const start = createDriveWorld(48, 1);
  const r16World = strip(start), e: Engine16 = { world: r16World, day: 0, meter: meterStart(r16World) };
  const { summary, rows } = await runDay16(e, { ask: async (_r, packet) => ({ p: fakeOdds(packet), tokens: null, ms: 0, worker: 1, retry: 0 }),
    decoder: newDecoder({ mode: 'draw', salt: 1, hold: 'act' }), journal: new Map(), ticks: WINDOW });
  const mine = structuredClone(start), loop = new DriveLoop(mine);
  const passes = await runDriveTicks(loop, fakeKernel, WINDOW);
  assert.ok(passes.length > 10 && summary.asks > 20, `a real hour of asks (${summary.asks})`);
  assert.equal(worldHash(strip(mine)), summary.hash, 'the same world after the same hour');
  assert.equal(loop.stats.asks, summary.asks); assert.equal(loop.stats.byModel, summary.kernel); assert.equal(loop.stats.calls, summary.calls);
  assert.equal(loop.fallbackCount(), Object.values(summary.fallbacks).reduce((a, b) => a + b, 0));
  // the ledger: per animal and in total, minutes by owner equal R16's own minutes (the meter's `own`)
  const totals = loop.ledger.totals(), sum = { model: 0, held: 0, rules: 0 }, r16sum = { model: 0, held: 0, rules: 0 };
  for (const r of rows) {
    assert.deepEqual(totals.get(r.id), r.own, `animal ${r.id}`);
    for (const k of ['model', 'held', 'rules'] as const) { r16sum[k] += r.own[k]; sum[k] += totals.get(r.id)![k]; }
  }
  const win = loop.ledger.window();
  assert.equal(win.ticks, WINDOW);
  assert.deepEqual({ model: win.model, held: win.held, rules: win.rules }, r16sum, 'the readout\'s hour is R16\'s minutes');
  assert.deepEqual(shares(win), shares(r16sum));
  assert.ok(win.model > 0 && win.held > 0 && win.rules > 0, JSON.stringify(win));
  assert.equal(win.rulesYoung + win.rulesAdult, win.rules);
  // the ledger's own book: a rules minute for an animal under 8 is never a model or held minute
  for (const c of mine.chimps.filter(c => c.alive && c.age < DRIVE_MIN_AGE)) { const a = loop.ledger.animal(c.id)!; assert.equal(a.model + a.held, 0, c.name); }
  assert.equal(win.rulesYoung, mine.chimps.filter(c => c.alive && c.age < DRIVE_MIN_AGE).length * WINDOW * TICK_MIN);
});
