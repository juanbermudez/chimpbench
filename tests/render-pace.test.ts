import assert from 'node:assert/strict';
import test from 'node:test';
import { SPEED_PRESETS } from '../src/clock';
import { GAITS, Regime, solveClimb, solveGait, type GaitSolve } from '../src/render/creatures/gait';
import { ADULT_BODY_M, SMALL_MAP_RATE, clipHeld, lapseRate, movingK, referenceRate, smallMapPace, walkPace } from '../src/render/creatures/pace';
import { CLIPS, Pw, type PoseCtx } from '../src/render/creatures/poses';
import { LIMB, PI, createPose } from '../src/render/creatures/rig';
import { DEFAULT_PARAMS, resolveParams } from '../src/sim/params';

// Stage W1: the pace a world's walk is read at (creatures/pace.ts), the watching speed and the climbing cadence cap.
const g = (): GaitSolve => ({ f: 0, stride: 0, regime: Regime.natural });
const FIELD = resolveParams('field'), GAIT = resolveParams('field', { walkGait: 1 });
/** Body lengths a second a speed (m per ecological second) reads as at a world's reference rate, for an adult. */
const reads = (P: typeof FIELD, mps: number) => mps * referenceRate(P) / ADULT_BODY_M;

test('the 160 m map keeps its own pace exactly, so the creature layer runs its original expressions there', () => {
  assert.equal(walkPace(DEFAULT_PARAMS), DEFAULT_PARAMS.walkMps);
  assert.equal(smallMapPace(DEFAULT_PARAMS), true);
  assert.equal(referenceRate(DEFAULT_PARAMS), SMALL_MAP_RATE, 'exactly 60, not 59.999…');
  assert.equal(smallMapPace(FIELD), false); assert.equal(smallMapPace(GAIT), false);
});

test('at the reference rate a field walker reads as the small map\'s walker and a runner as its runner', () => {
  const small = DEFAULT_PARAMS.walkMps * SMALL_MAP_RATE / ADULT_BODY_M;
  assert.ok(Math.abs(reads(FIELD, FIELD.walkMps) - small) < 1e-12);
  assert.ok(Math.abs(referenceRate(FIELD) - 60 * 0.04 / 0.35) < 1e-12);
  // The layer's thresholds (creatures.ts): moving above 0.3 body lengths a second, gallop above 3.2.
  assert.ok(reads(FIELD, FIELD.walkMps) > 0.3 && reads(FIELD, FIELD.walkMps) < 3.2, 'a walker walks');
  assert.ok(reads(FIELD, FIELD.walkMps * 1.8) < 3.2, 'the fastest walking act (× 1.8) still walks');
  assert.ok(reads(FIELD, FIELD.walkMps * 0.6) > 0.3, 'a slow old animal (× 0.6) still counts as moving');
  assert.ok(reads(FIELD, FIELD.runMps * 0.8) > 3.2, 'a runner gallops');
});

test('with the gait mechanism on the reference is the body\'s walking speed, so 0.78 to 0.88 m/s is a walk and not a gallop', () => {
  assert.equal(walkPace(GAIT), 0.88);
  assert.equal(walkPace(resolveParams('compressed', { walkGait: 1 })), DEFAULT_PARAMS.walkMps, 'the switch acts on the field map only');
  for (const v of [GAIT.walkGaitFemaleMps, GAIT.walkGaitMaleMps, GAIT.walkGaitMaleMps * 1.8]) assert.ok(reads(GAIT, v) > 0.3 && reads(GAIT, v) < 3.2, `${v} m/s walks`);
  assert.ok(reads(GAIT, GAIT.runMps) > 3.2);
  assert.ok(GAIT.walkMps * referenceRate(resolveParams('field')) / ADULT_BODY_M < 3.2 && GAIT.walkGaitMaleMps * referenceRate(FIELD) / ADULT_BODY_M > 3.2, 'read at the walkMps reference the same body would gallop');
});

test('the watching speed draws the field walk with feet that grip; 1 min/s is time-lapse there and natural on the 160 m map', () => {
  const watch = SPEED_PRESETS.find(p => p.id === 'watch')!;
  assert.equal(watch.ecoSecondsPerSecond, 4);
  assert.ok(watch.ecoSecondsPerSecond < lapseRate(FIELD) && lapseRate(FIELD) < 60, `field: time-lapse above ${lapseRate(FIELD).toFixed(1)} s/s`);
  assert.ok(lapseRate(DEFAULT_PARAMS) > 60, 'the 160 m map walks naturally at 1 min/s');
  for (const body of [1.36, ADULT_BODY_M, 1.54]) {
    const s = solveGait(GAITS.walk, FIELD.walkMps * watch.ecoSecondsPerSecond / body, Regime.natural, g());
    assert.equal(s.regime, Regime.natural, `a ${body} m adult at the watching speed is on a natural walk`);
    assert.ok(s.f > 1.4 && s.f < 1.9 && s.stride > 0.5 && s.stride <= GAITS.walk.strideMax);
  }
  assert.equal(solveGait(GAITS.walk, FIELD.walkMps * 60 / ADULT_BODY_M, Regime.natural, g()).regime, Regime.timelapse);
  assert.equal(solveGait(GAITS.walk, FIELD.walkMps / ADULT_BODY_M, Regime.natural, g()).regime, Regime.natural, 'Real time: a slow natural walk');
});

test('the climbing cadence stops at the cap the gait table names, with the same hysteresis as walking', () => {
  const c = GAITS.climb, body = ADULT_BODY_M;
  const real = solveClimb(c, 0.22 / body, Regime.natural, g());
  assert.equal(real.regime, Regime.natural);
  assert.ok(Math.abs(real.f - 0.22 / body / c.strideMax) < 1e-12, 'below the cap the cadence is speed over stride');
  const watch = solveClimb(c, 0.22 * 4 / body, Regime.natural, g());
  assert.equal(watch.regime, Regime.natural); assert.ok(watch.f < c.fCap);
  const lapse = solveClimb(c, 0.22 * 60 / body, Regime.natural, g());
  assert.equal(lapse.regime, Regime.timelapse); assert.equal(lapse.f, c.fCap, 'not 16 cycles a second');
  assert.equal(solveClimb(c, -0.22 * 60 / body, Regime.natural, g()).f, c.fCap, 'descending too');
  const edge = c.fCap * c.strideMax;
  let r: Regime = solveClimb(c, edge * 1.02, Regime.natural, g()).regime;
  assert.equal(r, Regime.timelapse);
  for (let i = 0; i < 40; i++) { r = solveClimb(c, edge * (1 + (i % 2 ? 0.05 : -0.05)), r, g()).regime; assert.equal(r, Regime.timelapse); }
  assert.equal(solveClimb(c, edge * 0.8, r, g()).regime, Regime.natural);
});

// The stop (poses.ts PoseCtx.settle): what the creature layer feeds the gait clips while a stopped walker still counts as moving.
const poseCtx = (over: Partial<PoseCtx> = {}): PoseCtx => ({
  t: 1, freq: 1.2, time: 3, phase: 0, speedU: 0.7, seed: 0.3, stage: 'adult', male: true, age: 20, injury: 0, mood: 'calm', energy: 1, vocal: null,
  hasTarget: false, tx: 0, ty: 0, tz: 0, tdist: 99, tsize: 1, role: 0, inTree: false, wet: 0, stride: 0.6, lp: 0.6, lapse: 0, settle: 0,
  pb: new Float32Array(15), hasBones: false, pairT: 0, side: 1, ...over,
});
const posed = (clip: string, c: PoseCtx): Float32Array => { const p = createPose(); CLIPS[clip](new Pw().bind(p).reset(), c); return p.v; };
const ikY = (v: Float32Array, limb: number) => v[PI.ik + limb * 5 + 1], ikZ = (v: Float32Array, limb: number) => v[PI.ik + limb * 5 + 2];
const planted = (v: Float32Array, limb: number) => v[PI.contact + limb];

test('a stopped walker puts its swinging hand or foot down where it is; a walk in progress keeps its full swing', () => {
  // Swing heights the gait clips had before this stage (poses.ts quadGait: hands, feet), in unit body lengths.
  const swing: Record<string, [number, number]> = { walk: [0.075, 0.07], sneak: [0.075, 0.07], gallop: [0.13, 0.12] };
  for (const clip of ['walk', 'sneak', 'gallop']) {
    const peak = [0, 0, 0, 0], airborne = [0, 0, 0, 0];
    for (let k = 0; k < 400; k++) {
      const phase = k / 400;
      const going = posed(clip, poseCtx({ phase })), half = posed(clip, poseCtx({ phase, settle: 0.5 })), down = posed(clip, poseCtx({ phase, settle: 1 }));
      for (let l = 0; l < 4; l++) {
        const lift = ikY(going, l) - ikY(down, l);
        assert.equal(planted(down, l), 1, `${clip}: settled, limb ${l} counts as planted at phase ${phase}`);
        assert.equal(ikZ(down, l), ikZ(going, l), `${clip}: the limb comes down where its swing had reached, it is not moved`);
        if (planted(going, l)) assert.equal(lift, 0, `${clip}: a limb already in stance is untouched`);
        else { airborne[l]++; assert.ok(lift >= 0); peak[l] = Math.max(peak[l], lift); }
        assert.ok(Math.abs((ikY(half, l) - ikY(down, l)) - lift / 2) < 1e-6, `${clip}: half settled, half the swing height`);
        assert.equal(planted(half, l), planted(going, l), `${clip}: not counted as planted until it is down`);
      }
    }
    for (let l = 0; l < 4; l++) {
      assert.ok(airborne[l] > 0, `${clip}: limb ${l} swings during a cycle`);
      assert.ok(Math.abs(peak[l] - swing[clip][l < 2 ? 0 : 1]) < 1e-3, `${clip}: limb ${l} swings ${peak[l]} high while walking, as before`);
    }
  }
});

test('a stopped biped (the swagger of a display) puts its raised foot down too', () => {
  let airborne = 0;
  for (let k = 0; k < 200; k++) {
    const phase = k / 200, going = posed('swagger', poseCtx({ phase })), down = posed('swagger', poseCtx({ phase, settle: 1 }));
    for (const l of [LIMB.legL, LIMB.legR]) {
      assert.equal(planted(down, l), 1);
      assert.ok(Math.abs(ikY(down, l) - 0.08) < 1e-6, 'the foot is at its stance height');
      if (!planted(going, l)) { airborne++; assert.ok(ikY(going, l) >= ikY(down, l)); }
    }
  }
  assert.ok(airborne > 0);
});

// Stage W14: the moving test reads the path at the faster of the playback and the reference rate on every map.
test('on the 160 m map a walker at Watch 4x and Real time reads as moving; at 1 min/s and faster nothing changes', () => {
  const refK = referenceRate(DEFAULT_PARAMS) / 3600, walk = DEFAULT_PARAMS.walkMps;
  const reads160 = (playback: number) => walk * movingK(playback / 3600, refK) * 3600 / ADULT_BODY_M;
  for (const pb of [1, 4]) {
    assert.ok(walk * pb / ADULT_BODY_M < 0.3, `drawn alone, a walk at ${pb} s/s reads as standing (the glide)`);
    assert.ok(reads160(pb) > 0.3, `read at the reference rate, a walk at ${pb} s/s is moving`);
  }
  for (const pb of [60, 240, 600, 3600]) assert.equal(movingK(pb / 3600, refK), pb / 3600, `at ${pb} s/s the playback rate itself`);
  // The field map's own reading (stage W1) is the same rule with its own reference rate.
  const fk = referenceRate(FIELD) / 3600;
  assert.equal(movingK(4 / 3600, fk), fk); assert.equal(movingK(60 / 3600, fk), 60 / 3600);
});

// Stage W14, second reader: the dwell (a clip plays at least CLIP_DWELL, 0.35 s) holds no body in a clip that does not
// move it once it has set off across the ground. Filmed: at 1 min/s on the field map a body landing from its trunk was
// drawn seated (perch) for the last 25 cm of the descent, and the dwell held that seat while it ran off at about 20 m/s,
// a seated glide of 5 to 7 m on the followed animal of a new world's opening.
test('the dwell keeps clips from flickering but holds no seated body that has set off across the ground', () => {
  const D = 0.35;
  // Set off on the ground from a clip that does not move the body: the walk (or gallop) is drawn at once.
  assert.equal(clipHeld(0.05, D, false, null, 'walk', true, true), false, 'a seated body that runs off is drawn walking');
  assert.equal(clipHeld(0.05, D, false, null, 'gallop', true, true), false);
  // Everything else is held as before.
  assert.equal(clipHeld(0.05, D, false, null, null, false, true), true, 'one stationary clip for another: held');
  assert.equal(clipHeld(0.05, D, false, 'walk', null, false, true), true, 'a walker that stops is held in its walk a moment');
  assert.equal(clipHeld(0.05, D, false, null, 'walk', false, true), true, 'a turn on the spot (the walk clip, not moving) is held');
  assert.equal(clipHeld(0.05, D, false, null, 'walk', true, false), true, 'in a tree (the clamber) as before');
  assert.equal(clipHeld(0.05, D, false, null, 'climb', true, true), true, 'onto the trunk as before');
  assert.equal(clipHeld(0.05, D, false, 'walk', 'gallop', true, true), true, 'one gait for another: held');
  // An urgent clip, or a clip that has played its dwell, is never held.
  assert.equal(clipHeld(0.05, D, true, null, null, false, true), false);
  assert.equal(clipHeld(0.4, D, false, null, null, false, true), false);
});
