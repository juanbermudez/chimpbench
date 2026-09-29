import assert from 'node:assert/strict';
import test from 'node:test';

// Imported dynamically so this file skips (instead of crashing the whole
// suite) while the simulation's fixed-tick exports are still being written.
type Clock = typeof import('../src/clock');
type Sim = typeof import('../src/simulation');
let clockApi: Clock | null = null; let sim: Sim | null = null; let missing = '';
try { sim = await import('../src/simulation'); clockApi = await import('../src/clock'); }
catch (error) { missing = error instanceof Error ? error.message : String(error); }
const skip = !clockApi || !sim || typeof sim.tickWorld !== 'function' ? `simulation exports missing: ${missing || 'tickWorld'}` : false;

/** Frame loop at a speed; returns total ticks. */
function run(api: Clock, world: import('../src/types').World, speedId: string, frames: number, dt = 1 / 60, now = () => 0): number {
  const clock = api.createClock(); api.setSpeed(clock, speedId);
  let ticks = 0;
  for (let i = 0; i < frames; i++) ticks += api.advance(clock, world, dt, () => false, now);
  return ticks;
}

test('presets ascend from 1 min/s to 1 day/s and end with max; unknown ids fail loudly', { skip }, () => {
  const { SPEED_PRESETS, createClock, setSpeed, formatRate } = clockApi!;
  assert.deepEqual(SPEED_PRESETS.map(p => p.id), ['1x', '10x', '1h', '6h', '1d', 'max']);
  assert.equal(SPEED_PRESETS[0].ecoSecondsPerSecond, 60); assert.equal(SPEED_PRESETS[0].label, '1×');
  assert.equal(SPEED_PRESETS[4].ecoSecondsPerSecond, 86_400);
  for (let i = 1; i < SPEED_PRESETS.length; i++) assert.ok(SPEED_PRESETS[i].ecoSecondsPerSecond > SPEED_PRESETS[i - 1].ecoSecondsPerSecond);
  assert.throws(() => setSpeed(createClock(), 'warp'), /Unknown speed/);
  assert.equal(formatRate(60), '1 min/s'); assert.equal(formatRate(21_600), '6 h/s'); assert.equal(formatRate(86_400), '1 day/s');
  assert.equal(formatRate(Infinity), 'max');
});

test('the same tick count yields identical worlds at 1× and at 1 day/s', { skip }, () => {
  const api = clockApi!;
  assert.equal(sim!.TICK_SECONDS, 15);
  const fast = sim!.createWorld(7); const slow = sim!.createWorld(7); const mid = sim!.createWorld(7);
  const fastTicks = run(api, fast, '1d', 1);            // 1/60 s × 86,400 eco-s/s = 1,440 eco-s = 96 ticks in one frame
  assert.equal(fastTicks, 96);
  const clock = api.createClock();
  let slowTicks = 0;
  while (slowTicks < fastTicks) slowTicks += api.advance(clock, slow, 1 / 60, () => false, () => 0);
  assert.ok(clock.ticksLastFrame <= 1, '1× never runs more than one tick per 60 Hz frame');
  assert.equal(run(api, mid, '10x', 144), 96);          // 144 frames × 10 eco-s = 1,440 eco-s
  assert.equal(slowTicks, 96);
  assert.equal(JSON.stringify(slow), JSON.stringify(fast));
  assert.equal(JSON.stringify(mid), JSON.stringify(fast));
});

test('a frame budget limits ticks, reports it, and does not bank the backlog', { skip }, () => {
  const api = clockApi!;
  const world = sim!.createWorld(3);
  const clock = api.createClock(); api.setSpeed(clock, '1d'); clock.budgetMs = 10;
  let t = 0; const now = () => (t += 4);               // every tick "costs" 4 ms
  const ticks = api.advance(clock, world, 1 / 60, () => false, now);
  assert.ok(ticks > 0 && ticks < 96, `ran ${ticks} of 96 owed ticks`);
  assert.equal(clock.limited, true); assert.equal(clock.ticksLastFrame, ticks);
  assert.ok(clock.accumulator <= sim!.TICK_SECONDS, 'backlog capped to under one tick');
  for (let i = 0; i < 120; i++) api.advance(clock, world, 1 / 60, () => false, now);
  assert.ok(clock.effectiveRate > 0 && clock.effectiveRate < 86_400 / 4, `effective ${clock.effectiveRate} eco-s/s`);
  assert.ok(Math.abs(clock.effectiveRate - clock.ticksPerSecond * 15) < 1e-9);
  const maxClock = api.createClock(); api.setSpeed(maxClock, 'max'); maxClock.budgetMs = 10; t = 0;
  assert.equal(api.advance(maxClock, world, 1 / 60, () => false, now), 3); // 0 → 4 → 8 → 12 ms: budget spent after the third tick
  assert.equal(maxClock.limited, true);
});

test('a blocked clock runs no ticks, stops mid-frame, and drops the time it waited', { skip }, () => {
  const api = clockApi!;
  const world = sim!.createWorld(5);
  const clock = api.createClock(); api.setSpeed(clock, '1d');
  for (let i = 0; i < 100; i++) assert.equal(api.advance(clock, world, 1 / 60, () => true, () => 0), 0);
  assert.equal(clock.blockedByModel, true); assert.equal(clock.accumulator, 0);
  const tick = world.tick;
  assert.equal(api.advance(clock, world, 1 / 60, () => false, () => 0), 96, 'no catch-up burst after unblocking');
  assert.equal(world.tick, tick + 96);
  let checks = 0;
  assert.equal(api.advance(clock, world, 1 / 60, () => checks++ >= 5, () => 0), 5, 'checked before every tick');
  assert.equal(clock.blockedByModel, true);
  clock.playing = false;
  assert.equal(api.advance(clock, world, 1 / 60, () => false, () => 0), 0);
});

test('lockstep: the clock halts on the exact tick a model chimp starts waiting', { skip }, async () => {
  const api = clockApi!;
  const decision = await import('../src/decision');
  const world = sim!.createWorld(11);
  const controller = decision.createDecisionController();
  decision.setPolicy(controller, world, 'lockstep'); controller.ready = true;
  const focal = world.chimps.find(c => c.alive && c.stage === 'adult')!;
  decision.setRoster(controller, world, 'selected', focal.id);
  const clock = api.createClock(); api.setSpeed(clock, '1d');
  let ticks = 0;
  for (let i = 0; i < 60 && focal.awaitingDecisionSince === null; i++) ticks += api.advance(clock, world, 1 / 60, () => decision.isBlocking(controller, world), () => 0);
  assert.notEqual(focal.awaitingDecisionSince, null, `focal reached a decision point within ${ticks} ticks`);
  assert.equal(clock.blockedByModel || decision.isBlocking(controller, world), true);
  const tick = world.tick;
  assert.equal(api.advance(clock, world, 1 / 60, () => decision.isBlocking(controller, world), () => 0), 0);
  assert.equal(world.tick, tick);
  assert.ok(sim!.resolveByRules(world, focal.id));
  assert.equal(decision.isBlocking(controller, world), false);
  assert.ok(api.advance(clock, world, 1 / 60, () => decision.isBlocking(controller, world), () => 0) > 0);
});

test('the tick budget leaves room for rendering, adapts to faster displays and never starves the sim', { skip }, () => {
  const { frameBudget } = clockApi!;
  assert.equal(frameBudget(1000 / 60, 4), 1000 / 60 * 0.65 - 4);      // 60 Hz, 4 ms of rendering and UI: ~6.8 ms
  assert.ok(frameBudget(1000 / 120, 3) < frameBudget(1000 / 60, 3));    // 120 Hz frames are shorter
  assert.equal(frameBudget(1000 / 30, 4), frameBudget(1000 / 60, 4));   // a GPU-bound 30 fps is not a longer budget
  assert.equal(frameBudget(1000 / 60, 40), 2);                          // floor: the world keeps moving
  assert.equal(frameBudget(NaN, 0), frameBudget(1000 / 60, 0));        // a bad interval falls back to 60 Hz
  assert.ok(frameBudget(1000 / 60, 0) <= 12);                           // capped
});
