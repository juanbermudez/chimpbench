import assert from 'node:assert/strict';
import test from 'node:test';
import { FOLLOW_IDLE, FOLLOW_TAU, chaseArrived, chaseReset, chaseStep, createChase, jumpFor, nextFollow, userPanned, type Chase, type FollowState } from '../src/render/env/follow';

// Camera follow (render/env/follow.ts): the attach/detach state machine and the critically damped focus approach.

test('attach starts a glide; re-attaching to the same animal keeps the current state', () => {
  const a = nextFollow(FOLLOW_IDLE, { type: 'attach', id: 7 });
  assert.deepEqual(a, { id: 7, gliding: true });
  const tracking: FollowState = { id: 7, gliding: false };
  assert.equal(nextFollow(tracking, { type: 'attach', id: 7 }), tracking, 'F on the followed animal changes nothing');
  assert.deepEqual(nextFollow(tracking, { type: 'attach', id: 9 }), { id: 9, gliding: true }, 'another animal glides again');
});

test('the glide ends on arrival and tracking continues', () => {
  const s = nextFollow({ id: 3, gliding: true }, { type: 'arrived' });
  assert.deepEqual(s, { id: 3, gliding: false });
  assert.equal(nextFollow(s, { type: 'arrived' }), s);
});

test('panning, a programmatic move, reset and a lost animal detach', () => {
  const s: FollowState = { id: 4, gliding: false };
  for (const type of ['user-pan', 'pan-to', 'reset', 'lost'] as const) assert.deepEqual(nextFollow(s, { type }), FOLLOW_IDLE, type);
  assert.equal(nextFollow(FOLLOW_IDLE, { type: 'user-pan' }), FOLLOW_IDLE, 'detaching when free is a no-op');
});

test('wheel zoom and orbiting keep following; only the cinematic view detaches', () => {
  const s: FollowState = { id: 4, gliding: true };
  assert.equal(nextFollow(s, { type: 'wheel' }), s);
  assert.equal(nextFollow(s, { type: 'orbit' }), s);
  assert.equal(nextFollow(s, { type: 'view', mode: 'close' }), s);
  assert.equal(nextFollow(s, { type: 'view', mode: 'rts' }), s);
  assert.deepEqual(nextFollow(s, { type: 'view', mode: 'cinematic' }), FOLLOW_IDLE);
});

/** Runs the chase for n frames of dt toward the animal path at(t); returns the chase. */
function run(c: Chase, n: number, dt: number, at: (t: number) => [number, number, number], lock = () => false, t0 = 0) {
  for (let i = 1; i <= n; i++) { const [x, y, z] = at(t0 + i * dt); chaseStep(c, x, y, z, dt, lock(), jumpFor(64)); }
  return c;
}

test('the glide reaches a far animal at rest without overshoot and settles in about 1.3 s', () => {
  const c = createChase(); chaseReset(c, 0, 0, 0);
  let prev = 0;
  for (let i = 1; i <= 180; i++) {
    chaseStep(c, 3000, 0, 0, 1 / 60, false);
    assert.ok(c.f[0] >= prev - 1e-9 && c.f[0] <= 3000 + 1e-9, `monotone, no overshoot (${c.f[0]} at frame ${i})`);
    prev = c.f[0];
    if (i === 30) assert.ok(c.f[0] > 1500, 'more than half way within half a second');
  }
  // (1 + t/τ)·e^(−t/τ) of the distance is left after t seconds: 1% at ~6.6 τ.
  const d = createChase(); chaseReset(d, 0, 0, 0);
  run(d, Math.round(6.7 * FOLLOW_TAU * 60), 1 / 60, () => [100, 0, 0]);
  assert.ok(100 - d.f[0] < 1, `within 1% after 6.7 τ (${(100 - d.f[0]).toFixed(3)} m left)`);
});

test('the glide does not depend on the frame rate (exact step)', () => {
  const go = (fps: number) => { const c = createChase(); chaseReset(c, -40, 5, 12); run(c, fps, 1 / fps, () => [10, 2, -8]); return [...c.f, ...c.v]; };
  const a = go(30), b = go(144);
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `component ${i}: ${v} vs ${b[i]}`));
});

test('the glide settles onto a fast-moving animal (velocity fed forward) instead of trailing it', () => {
  // 10 min/s: a travelling chimp covers ~166 m of rendered path per real second. A plain spring would trail by 2·τ·v ≈ 66 m.
  const v = 166, at = (t: number): [number, number, number] => [200 + v * t, 3, -50 + 0.3 * v * t];
  const c = createChase(); chaseReset(c, 0, 0, 0);
  run(c, 90, 1 / 60, at);
  const [x, , z] = at(90 / 60);
  assert.ok(Math.hypot(c.f[0] - x, c.f[2] - z) < 2, `within 2 m after 1.5 s (${Math.hypot(c.f[0] - x, c.f[2] - z).toFixed(2)} m)`);
  run(c, 30, 1 / 60, at, () => false, 90 / 60);
  assert.ok(chaseArrived(c, 64), 'arrived within 2 s: close and moving with it');
});

test('locked, the focus rides the animal path exactly; a jump breaks the lock without a velocity kick', () => {
  const at = (t: number): [number, number, number] => [Math.sin(t) * 30, 0, t * 20];
  const c = createChase(); chaseReset(c, ...at(0));
  run(c, 1, 1 / 60, at);
  for (let i = 2; i < 120; i++) {
    const p = at(i / 60);
    assert.equal(chaseStep(c, ...p, 1 / 60, true, jumpFor(64)), false);
    assert.ok(Math.hypot(c.f[0] - p[0], c.f[2] - p[2]) < 1e-9, 'on the animal');
  }
  const before = [...c.f];
  assert.equal(chaseStep(c, before[0] + 500, 0, before[2], 1 / 60, true, jumpFor(64)), true, 'a 500 m move in one frame is a relocation');
  assert.ok(Math.abs(c.f[0] - before[0]) < 20, 'the focus does not jump with it');
  assert.ok(Math.abs(c.v[0]) < 400, 'and no 30 km/s velocity is fed forward');
});

test('lead: a position read one frame late is carried forward to where the animal is drawn', () => {
  // The scene moves the camera before the creature layer moves the animals, so positions are a frame old.
  const at = (t: number): [number, number, number] => [50 * t, 0, -20 * t];
  const c = createChase(); chaseReset(c, 0, 0, 0);
  for (let i = 1; i < 60; i++) chaseStep(c, ...at((i - 1) / 60), 1 / 60, true, jumpFor(64), 1);
  const drawn = at(59 / 60);
  assert.ok(Math.hypot(c.f[0] - drawn[0], c.f[2] - drawn[2]) < 1e-6, 'on the drawn animal, not a frame behind it');
});

test('arrival needs both proximity and matching speed, scaled by the frame height', () => {
  const c = createChase();
  c.e.set([0.1, 0, 0]); c.ev.set([0, 0, 0]);
  assert.equal(chaseArrived(c, 10), true);
  c.ev.set([2, 0, 0]);
  assert.equal(chaseArrived(c, 10), false, 'still moving relative to the animal');
  c.e.set([0.5, 0, 0]); c.ev.set([0, 0, 0]);
  assert.equal(chaseArrived(c, 10), false, 'too far at a 10 m frame');
  assert.equal(chaseArrived(c, 100), true, '1% of a 100 m frame');
});

test('a relocation glides again; it never attaches a free camera', () => {
  assert.deepEqual(nextFollow({ id: 5, gliding: false }, { type: 'relocated' }), { id: 5, gliding: true });
  assert.equal(nextFollow(FOLLOW_IDLE, { type: 'relocated' }), FOLLOW_IDLE);
});

test('a user pan needs a real drag that moved the focus while held or just released', () => {
  assert.equal(userPanned(0.5, 40, true, 0), true);
  assert.equal(userPanned(0.5, 40, false, 0.2), true, 'damping carries the pan on after release');
  assert.equal(userPanned(0.5, 40, false, 0), false, 'long after release: not the user');
  assert.equal(userPanned(0.5, 3, true, 0), false, 'a click that jiggled is not a pan');
  assert.equal(userPanned(0, 40, true, 0), false, 'rotation keeps the focus: not a pan');
});
