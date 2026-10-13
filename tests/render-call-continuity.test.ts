import assert from 'node:assert/strict';
import test from 'node:test';
import { LIMBS, OFFSET, PI, beginBendHint, createBendHint, createFK, createMorph, createPose, solveFK } from '../src/render/creatures/rig';

const distance = (a: Float32Array, b: Float32Array, o: number) => Math.hypot(a[o] - b[o], a[o + 1] - b[o + 1], a[o + 2] - b[o + 2]);

test('call bend continuity crosses each limb pole without flipping or moving its full-weight endpoint', () => {
  for (let index = 0; index < LIMBS.length; index++) {
    const limb = LIMBS[index], m = createMorph(), pose = createPose(), fk = createFK(), raw = createFK(), hint = createBendHint();
    solveFK(pose, m, fk);
    const root = Array.from(fk.p.slice(limb.upper * 3, limb.upper * 3 + 3));
    const length = (bone: number) => Math.hypot(...OFFSET.slice(bone * 3, bone * 3 + 3));
    const reach = 0.6 * (length(limb.lower) + length(limb.end));
    const o = PI.ik + index * 5;
    pose.v[o + 3] = pose.v[o + 4] = 1;
    const target = (offset: number) => {
      const dir = [...limb.pole]; dir[1] += offset;
      const norm = Math.hypot(...dir);
      for (let k = 0; k < 3; k++) pose.v[o + k] = root[k] + dir[k] / norm * reach;
    };
    target(-0.2); solveFK(pose, m, fk);
    let peak = 0, rawPeak = 0, lastRaw = fk.p.slice(), limited = 0;
    for (let frame = 1; frame <= 120; frame++) {
      const previous = fk.p.slice();
      beginBendHint(hint, fk, 1 / 60);
      target(-0.2 + frame / 300);
      solveFK(pose, m, raw);
      solveFK(pose, m, fk, null, hint);
      peak = Math.max(peak, distance(previous, fk.p, limb.lower * 3));
      rawPeak = Math.max(rawPeak, distance(lastRaw, raw.p, limb.lower * 3)); lastRaw = raw.p.slice();
      if (hint.limited) {
        limited++;
        const pausedMidTurn = fk.p.slice(); beginBendHint(hint, fk, 0); solveFK(pose, m, fk, null, hint);
        assert.ok(distance(fk.p, pausedMidTurn, limb.lower * 3) < 1e-6, 'pause holds an unfinished plane rotation');
      }
      const e = limb.end * 3;
      const error = Math.hypot(fk.p[e] - pose.v[o], fk.p[e + 1] - pose.v[o + 1], fk.p[e + 2] - pose.v[o + 2]);
      assert.ok(error < 1e-5, `limb ${index} frame ${frame}: endpoint error ${error}`);
      const end = limb.end * 4;
      const dot = fk.q.slice(end, end + 4).reduce((sum, v, k) => sum + v * raw.q[end + k], 0);
      assert.ok(Math.abs(dot) > 0.99999, 'locked hand/foot orientation preserved');
      const once = fk.p.slice(); solveFK(pose, m, fk, null, hint);
      assert.deepEqual(fk.p, once, 'a repeated contact solve uses the same prior, without another time step');
      for (let q = 0; q < fk.q.length; q += 4) assert.ok(Math.abs(Math.hypot(...fk.q.slice(q, q + 4)) - 1) < 1e-5);
    }
    assert.ok(limited > 0 && rawPeak > 0.1, `limb ${index}: fixture crosses the original flip (${rawPeak})`);
    assert.ok(peak < 0.035, `limb ${index}: largest elbow/knee step ${peak}`);
    // A stationary target converges exactly to the ordinary preferred bend, permitting the caller to disengage.
    for (let frame = 0; frame < 120; frame++) { beginBendHint(hint, fk, 1 / 60); solveFK(pose, m, fk, null, hint); }
    assert.equal(hint.limited, false);
    assert.ok(distance(fk.p, raw.p, limb.lower * 3) < 1e-5);
    const paused = fk.p.slice(); beginBendHint(hint, fk, 0); solveFK(pose, m, fk, null, hint);
    assert.ok(distance(fk.p, paused, limb.lower * 3) < 1e-6, 'pause does not advance the plane');
  }
});

test('first-frame and ordinary IK have identical output without a prior bend plane', () => {
  const m = createMorph(), pose = createPose(), ordinary = createFK(), first = createFK();
  for (let i = 0; i < 4; i++) {
    const o = PI.ik + i * 5;
    pose.v[o] = i % 2 ? -0.2 : 0.2; pose.v[o + 1] = 0.1; pose.v[o + 2] = 0.3; pose.v[o + 3] = 1;
  }
  solveFK(pose, m, ordinary); solveFK(pose, m, first, null, createBendHint());
  assert.deepEqual(first, ordinary);
});
