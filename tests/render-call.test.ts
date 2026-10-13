import assert from 'node:assert/strict';
import test from 'node:test';
import type { Call, Chimp } from '../src/types';
import { CALL_ACT, CALL_ALLFOURS_V, CALL_BASE, CALL_JOIN, CALL_QUIET, CALL_RISE, CALL_UPRIGHT_V, CLIPS, FEED, NEST_BAR_JITTER, NEST_BAR_S, NEST_BRIEF_S, Pw, callSquat, callStyle, callVigour, drinksWithSponge, feedPlan, nestBar, vocalOverlay, type PoseCtx } from '../src/render/creatures/poses';
import { B, LIMB, PI, POSE_SIZE, computeMorph, createFK, createMorph, createPose, lowestPoint, solveFK } from '../src/render/creatures/rig';
import { hash01 } from '../src/render/creatures/util';
import { ANSWER_H, JOIN_H, JOIN_NEAR_M, callAge, callJoin, callNumber } from '../src/render/creatures/call';
import { NEST_BUILD_S, NEST_HOLD_K, NEST_TURNS, NEST_TURN_MAX, nestTurnAt, nestTurnReset, nestTurnState, nestTurnStep, slewHeading, slewTurn } from '../src/render/creatures/perch';
import { Posture, postureOf } from '../src/render/creatures/intention';

// Stage W13 (docs/staging/w13-chorus-and-spin.md), "the chorus and the spin". Stage W12 gave every clip the animal's
// own tempo. What still read as a machine: every caller of a pant-hoot made the same stand with both arms raised on
// one nine-second cycle; a nest builder turned through all its headings in the three seconds a building lasts at the
// app's default speed; feeders in a crown ran one sequence at different tempos. These tests hold what the stage
// registered. Everything drawn is a stylization: they say that a group is a group of animals, each its own, and that
// nothing spins; not how a chimpanzee calls.

const CLOCK0 = 1000;
interface Who { id: number; age: number; male: boolean; rank?: number; arousal?: number }
// The creature harness's `stages` row: three infants, a juvenile, an adolescent female and male, an adult female and male, an elder female and male.
const ROW: Who[] = [[0.4, false], [1.5, true], [3.5, false], [6.5, true], [10.5, false], [13, true], [22, false], [26, true], [44, false], [41, true]].map(([age, male], i) => ({ id: i + 1, age: age as number, male: male as boolean }));
const stageOf = (age: number): PoseCtx['stage'] => age < 4 ? 'infant' : age < 8 ? 'juvenile' : age < 15 ? 'adolescent' : age < 35 ? 'adult' : 'elder';
/** The pose context of `who`, `t` seconds after it entered a clip, as src/render/creatures.ts evaluatePose builds it. */
function ctxOf(who: Who, t: number, over: Partial<PoseCtx> = {}): PoseCtx {
  const clock = CLOCK0 + t, time = clock + hash01(who.id, 13) * 100, seed = hash01(who.id, 17);
  return {
    t, freq: 0, time, phase: hash01(who.id, 3), speedU: 0, seed, stage: stageOf(who.age), male: who.male, age: who.age, injury: 0, mood: 'excited', energy: 0.8, vocal: 'pant-hoot',
    hasTarget: false, tx: 0, ty: 0, tz: 0, tdist: 99, tsize: 1, role: 0, inTree: false, wet: 0, stride: 0, lp: 0, lapse: 0, settle: 0, pb: new Float32Array(15), hasBones: false, pairT: time, pairSeed: seed, side: 1, bears: 0,
    rank: who.rank ?? (who.age >= 15 ? 0.5 : 0.05), arousal: who.arousal ?? 0.3, callN: 0, join: CALL_JOIN.none, enter: 0, ...over,
  };
}
const pose = createPose(), w = new Pw(), fk = createFK();
interface Run { n: number; fps: number; v: Float32Array; hips: Float32Array; pitch: Float32Array; wl: Float32Array; wr: Float32Array; head: Float32Array; mouth: Float32Array; post: Uint8Array }
/** One animal in one clip: the pose buffers and, through the rig's own forward kinematics, the heights of the hips, both wrists and the head in body lengths. */
function run(who: Who, clip: string, seconds: number, fps: number, over: Partial<PoseCtx> = {}): Run {
  const n = Math.round(seconds * fps), m = createMorph();
  computeMorph({ age: who.age, sex: who.male ? 'male' : 'female', id: who.id, appearance: { fur: 0.5, face: 0.5, build: 0.5, brow: 0.5, ears: 0.5 } } as unknown as Chimp, m);
  const R: Run = { n, fps, v: new Float32Array(n * POSE_SIZE), hips: new Float32Array(n), pitch: new Float32Array(n), wl: new Float32Array(n), wr: new Float32Array(n), head: new Float32Array(n), mouth: new Float32Array(n), post: new Uint8Array(n) };
  for (let f = 0; f < n; f++) {
    w.bind(pose).reset(); CLIPS[clip](w, ctxOf(who, f / fps, over)); R.v.set(pose.v, f * POSE_SIZE);
    solveFK(pose, m, fk, null);
    const lift = pose.v[PI.ground] > 0.01 ? -lowestPoint(fk, m) * pose.v[PI.ground] : 0, s = m.size;
    R.hips[f] = (fk.p[B.hips * 3 + 1] + lift) / s; R.pitch[f] = pose.v[B.hips * 3]; R.wl[f] = (fk.p[B.handL * 3 + 1] + lift) / s; R.wr[f] = (fk.p[B.handR * 3 + 1] + lift) / s; R.head[f] = (fk.p[B.head * 3 + 1] + lift) / s; R.mouth[f] = pose.v[PI.mouth];
    // 3 upright on two legs (the hips above half a body length, the trunk within 0.6 rad of upright), 2 on all fours, 1 seated,
    // 0 other (a squat, or a body on its way up or down).
    const q = postureOf(pose.v); R.post[f] = q === Posture.quad ? 2 : q === Posture.seated ? 1 : R.hips[f] > 0.5 && pose.v[B.hips * 3] < 0.6 ? 3 : 0;
  }
  return R;
}
const median = (x: number[]) => x.slice().sort((p, q) => p - q)[Math.floor(x.length / 2)];
const armsUp = (R: Run, f: number) => R.wl[f] > R.head[f] && R.wr[f] > R.head[f];
/** Within the registered posture tolerance of each other: hips within 0.06 body lengths in height and 0.2 rad in pitch, each wrist within 0.12 in height, the head within 0.1. */
const alike = (a: Run, f: number, b: Run, g: number) => Math.abs(a.hips[f] - b.hips[g]) < 0.06 && Math.abs(a.pitch[f] - b.pitch[g]) < 0.2 && Math.abs(a.wl[f] - b.wl[g]) < 0.12 && Math.abs(a.wr[f] - b.wr[g]) < 0.12 && Math.abs(a.head[f] - b.head[g]) < 0.1;
const isSwitch = (ch: number) => (ch >= PI.ik && ch < PI.ik + 20 && (ch - PI.ik) % 5 >= 3) || (ch >= PI.contact && ch < PI.contact + 4) || ch === PI.ground;
/** For every pair of runs: the correlation of the two animals' movement (every moving channel, its own mean removed, pooled) at the best time shift within `lagS`. */
function bestShift(runs: Run[], lagS: number): number[] {
  const n = runs[0].n, fps = runs[0].fps, keep: number[] = [];
  for (let ch = 0; ch < POSE_SIZE; ch++) { if (isSwitch(ch)) continue; if (runs.some(R => { let lo = Infinity, hi = -Infinity; for (let f = 0; f < n; f++) { const y = R.v[f * POSE_SIZE + ch]; if (y < lo) lo = y; if (y > hi) hi = y; } return hi - lo > 1e-4; })) keep.push(ch); }
  const K = keep.length, C = runs.map(R => { const c = new Float32Array(n * K); keep.forEach((ch, q) => { let m = 0; for (let f = 0; f < n; f++) m += R.v[f * POSE_SIZE + ch]; m /= n; for (let f = 0; f < n; f++) c[f * K + q] = R.v[f * POSE_SIZE + ch] - m; }); return c; });
  const corr = (a: Float32Array, b: Float32Array, lag: number) => { let sab = 0, saa = 0, sbb = 0; for (let f = Math.max(0, lag); f < Math.min(n, n + lag); f++) { const oa = f * K, ob = (f - lag) * K; for (let q = 0; q < K; q++) { const x = a[oa + q], y = b[ob + q]; sab += x * y; saa += x * x; sbb += y * y; } } return saa > 1e-12 && sbb > 1e-12 ? sab / Math.sqrt(saa * sbb) : 0; };
  const out: number[] = [], L = Math.round(lagS * fps);
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) { let best = -1; for (let lag = -L; lag <= L; lag++) best = Math.max(best, corr(C[i], C[j], lag)); out.push(best); }
  return out;
}

// ---- The chorus ----
test('nobody raises both arms: ten callers of every age, on the ground, in a crown and from all fours', () => {
  for (const [name, over] of [['seated', {}], ['in a crown', { inTree: true }], ['from all fours', { role: CALL_BASE.quad }], ['aroused', { arousal: 0.9 }], ['top-ranking', { rank: 1 }]] as [string, Partial<PoseCtx>][]) {
    for (const who of ROW) for (const callN of [0, 1, 2, 3]) {
      const R = run(who, 'pantHoot', 20, 20, { ...over, callN });
      for (let f = 0; f < R.n; f++) assert.ok(!armsUp(R, f), `${name}, animal ${who.id}, call ${callN}: both wrists above the head at ${(f / 20).toFixed(1)} s (it was every caller, 9 s of every 45)`);
      // One wrist may be above the head only where a hand holds a branch overhead, in a crown.
      if (!over.inTree) for (let f = 0; f < R.n; f++) assert.ok(R.wl[f] <= R.head[f] + 0.02 && R.wr[f] <= R.head[f] + 0.02, `${name}, animal ${who.id}: a wrist above the head on the ground`);
      assert.ok(R.v.every(Number.isFinite));
    }
  }
});

test('the picture follows who the animal is: the young and the females stay down, a crown seats everybody', () => {
  for (const callN of [0, 1, 2, 3, 4, 5, 6, 7]) for (const who of ROW) {
    const R = run(who, 'pantHoot', 18, 15, { callN, rank: 1, arousal: 1 });
    const upright = R.post.some(p => p === 3), adultMale = who.male && who.age >= 15;
    if (!adultMale) assert.ok(!upright, `animal ${who.id} (${who.male ? 'male' : 'female'}, ${who.age}) never stands on two legs, however aroused`);
    else assert.ok(upright, 'a top-ranking, fully aroused adult male does');
    if (who.age < 8) assert.ok(R.post.every(p => p === R.post[0]) && Math.max(...R.hips) - Math.min(...R.hips) < 0.03, 'an infant or a juvenile stays as it sat');
    if (who.age < 4) assert.ok(R.post[0] === 1 && callSquat(hash01(who.id, 17), who.age) === 0, 'an infant sits');
    // (The body rests on the ground: a hand put down does not go under it and lift the body.)
    assert.ok(Math.min(...R.hips) > 0.12 && R.hips[0] < 0.34, `animal ${who.id}: the hips are ${R.hips[0].toFixed(2)} body lengths up at the start`);
    const tree = run(who, 'pantHoot', 18, 15, { callN, rank: 1, arousal: 1, inTree: true });
    assert.ok(tree.post.every(p => p === 1) && tree.v[PI.ground] === 0, `animal ${who.id} on a limb stays seated on it`);
    // In a crown a hand holds on all through (the fingers closed round a support: idle.ts handHolds reads the curl).
    for (let f = 0; f < tree.n; f += 5) assert.ok(Math.max(tree.v[f * POSE_SIZE + B.fingL * 3], tree.v[f * POSE_SIZE + B.fingR * 3]) > 0.6, 'a hand keeps its hold');
    // An animal that was on all fours calls on all fours (unless it is an adult male that stands at the climax).
    const quad = run(who, 'pantHoot', 18, 15, { callN, role: CALL_BASE.quad });
    assert.equal(quad.post[0], 2); assert.ok(quad.post.every(p => p === 2 || (adultMale && (p === 3 || p === 0))) && Math.min(...quad.hips) > 0.4, `animal ${who.id} from all fours does not sit down to call`);
  }
});

test('vigour: rank and arousal raise it, sex and age class set it; an upright climax is an adult male\'s and rare', () => {
  for (const seed of [0.1, 0.5, 0.9]) for (const n of [0, 3]) {
    let last = -1; for (let r = 0; r <= 1.001; r += 0.1) { const v = callVigour(seed, true, 25, r, 0.3, n); assert.ok(v >= last); last = v; }
    last = -1; for (let a = 0; a <= 1.001; a += 0.1) { const v = callVigour(seed, false, 25, 0.4, a, n); assert.ok(v >= last); last = v; }
    assert.ok(callVigour(seed, true, 25, 0.5, 0.3, n) > callVigour(seed, false, 25, 0.5, 0.3, n), 'a male above a female of the same standing');
    assert.ok(callVigour(seed, true, 25, 0.5, 0.3, n) > callVigour(seed, true, 11, 0.5, 0.3, n) && callVigour(seed, true, 11, 0, 0.3, n) > callVigour(seed, true, 6, 0, 0.3, n) && callVigour(seed, true, 6, 0, 0.3, n) > callVigour(seed, true, 2, 0, 0.3, n) - 1e-9, 'adult over adolescent over juvenile over infant');
  }
  /** Of 400 calls each by 40 animals: the share with an upright climax, and the share that rise to all fours or further. */
  const shares = (male: boolean, age: number, rank: number, arousal: number) => { let up = 0, four = 0, tot = 0; for (let id = 1; id <= 40; id++) for (let n = 0; n < 400; n++) { const st = callStyle(ctxOf({ id, age, male, rank, arousal }, 0, { callN: n })); tot++; if (st.rise === CALL_RISE.upright) up++; if (st.rise >= CALL_RISE.allFours) four++; } return [up / tot, four / tot]; };
  const top = shares(true, 25, 1, 0.3), mid = shares(true, 25, 0.5, 0.3), low = shares(true, 25, 0, 0.3), lowHot = shares(true, 25, 0, 0.9), topHot = shares(true, 25, 1, 0.9);
  assert.ok(top[0] > 0.15 && top[0] < 0.5, `the top male stands in ${(100 * top[0]).toFixed(0)}% of his calls: fewer than half`);
  assert.equal(low[0], 0, 'the bottom male in none while calm'); assert.ok(lowHot[0] > 0.1, `aroused, in ${(100 * lowHot[0]).toFixed(0)}%`); assert.ok(topHot[0] > top[0] + 0.3);
  assert.ok(mid[0] < top[0] && mid[1] > 0.8 && low[1] > 0.4, 'adult males mostly rise to all fours');
  // Over the ranks, a calm adult male's calls with an upright climax: aimed at the 7.5% of pant-hoots given in a display [fedurek2014, southern2025].
  let sum = 0; for (let r = 0; r <= 1.0001; r += 0.05) sum += shares(true, 25, r, 0.3)[0] / 21;
  assert.ok(sum > 0.04 && sum < 0.13, `an upright climax in ${(100 * sum).toFixed(1)}% of calm adult males' calls`);
  for (const [rank, arousal] of [[0, 0.3], [0.8, 0.3], [0.8, 1]]) { const f = shares(false, 25, rank, arousal); assert.equal(f[0], 0, 'no female stands upright'); if (arousal < 0.5) assert.ok(f[1] < 0.2, `females rise to all fours in ${(100 * f[1]).toFixed(0)}% of calls`); }
  assert.deepEqual(shares(true, 6, 0, 0.3), [0, 0]); assert.equal(shares(true, 12, 0, 1)[0], 0, 'nor an adolescent male');
  assert.ok(CALL_UPRIGHT_V > CALL_ALLFOURS_V);
  // What it does at the climax goes with how far it rises; in a crown it only ever shakes the branch it holds.
  for (let id = 1; id <= 20; id++) for (let n = 0; n < 40; n++) {
    const st = callStyle(ctxOf({ id, age: 25, male: true, rank: 1, arousal: 0.6 }, 0, { callN: n })), tree = callStyle(ctxOf({ id, age: 25, male: true, rank: 1, arousal: 0.6 }, 0, { callN: n, inTree: true }));
    assert.ok(st.rise === CALL_RISE.upright ? st.act === CALL_ACT.sway || st.act === CALL_ACT.stamp : st.act === CALL_ACT.none || st.act === CALL_ACT.slap);
    assert.equal(tree.rise, CALL_RISE.none); assert.ok(tree.act === CALL_ACT.none || tree.act === CALL_ACT.shake);
    assert.ok(st.intro >= 1.5 && st.intro <= 5 && st.build >= 2.2 && st.build <= 5.2 && st.climax >= 1 && st.climax <= 3.4 && st.down >= 0.9 && st.down <= 2.5 && Math.abs(st.total - st.intro - st.build - st.climax - st.down) < 1e-12);
  }
});

test('ten callers started together are a group, not ten copies or a canon', () => {
  const S = 45, fps = 15, runs = ROW.map(who => run(who, 'pantHoot', S, fps)), n = runs[0].n;
  const same: number[] = [], shifted: number[] = [];
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
    const a = runs[i], b = runs[j]; let k = 0; for (let f = 0; f < n; f++) if (alike(a, f, b, f)) k++;
    same.push(k / n);
    let best = 0; for (let lag = -6 * fps; lag <= 6 * fps; lag += 2) { let q = 0, m = 0; for (let f = Math.max(0, lag); f < Math.min(n, n + lag); f++) { m++; if (alike(a, f, b, f - lag)) q++; } if (m > n / 2 && q / m > best) best = q / m; }
    shifted.push(best);
  }
  // Registered (section 0.5, item 4). Before: 0.72 and 0.99; the closest pair 0.99 and 1.00.
  assert.ok(median(same) < 0.4, `two callers are in one posture for ${median(same).toFixed(2)} of the call (median over 45 pairs)`);
  assert.ok(median(shifted) < 0.5, `and for ${median(shifted).toFixed(2)} at the best shift within 6 s`);
  // Two quiet callers that happen to sit alike stay alike: the pairs within the tolerance for more than 0.85 of the call,
  // at the best shift, are under a third of the 45 (it was every pair: one posture, one movement, a moment apart).
  const close = shifted.filter(x => x > 0.85).length;
  assert.ok(close <= 15, `${close} of 45 pairs sit alike for most of the call`);
  // What the ten are in at the height of their call. In a calm row of middle rank nobody stands upright (by design an
  // upright climax is rare); with the two adult males at the top and aroused, somebody does.
  const classOf = (R: Run) => R.post.some(p => p === 3) ? 'upright' : R.post.some(p => p === 2) ? 'all fours' : Math.max(...R.hips) > 0.2 ? 'squatting' : 'seated';
  const classes = new Set(runs.map(classOf));
  assert.ok(classes.has('seated') && classes.has('all fours') && classes.size >= 3, `postures of a calm row: ${[...classes].join(', ')}`);
  const hot = new Set(ROW.map(who => classOf(run(who, 'pantHoot', 20, fps, { rank: 1, arousal: 0.8 }))));
  assert.ok(hot.has('seated') && hot.has('all fours') && hot.has('upright'), `postures of the row with its males at the top and aroused: ${[...hot].join(', ')}`);
  // Each gives one pant-hoot in the 45 s: the mouth is wide open in one stretch, and the stretches are spread over seconds.
  const firstWide = runs.map((R, i) => { let spans = 0, first = -1, last = -9; for (let f = 0; f < n; f++) if (R.mouth[f] > 0.42) { if (f / fps - last > 1) { spans++; if (first < 0) first = f / fps; } last = f / fps; } assert.equal(spans, 1, `animal ${ROW[i].id} opens its mouth wide in one stretch (${spans}); it was five risings in 45 s`); return first; });
  assert.ok(Math.max(...firstWide) - Math.min(...firstWide) >= 2.5, `the ten reach their climax over ${(Math.max(...firstWide) - Math.min(...firstWide)).toFixed(1)} s (${firstWide.map(x => x.toFixed(1)).join(' ')})`);
  // (No correlation of movement is held for a call: it is one event, not a loop, and any two things that happen once
  // in the first quarter of 45 s correlate over the 45. The postures above and the spread of the climaxes say it.)
  // After the call it sits, or stands, as it began, the mouth shut, the head a little raised: it listens.
  for (const R of runs) { const f = n - 1; assert.ok(R.mouth[f] < 0.06 && R.post[f] === R.post[0] && Math.abs(R.hips[f] - R.hips[0]) < 0.02); }
});

test('nothing steps inside a call: every channel moves at the pace of a body, at every vigour', () => {
  const fps = 60;
  for (const who of [ROW[7], ROW[9], ROW[6], ROW[3]]) for (const over of [{}, { rank: 1, arousal: 1 }, { rank: 1, arousal: 1, role: CALL_BASE.quad }, { inTree: true, rank: 1, arousal: 1 }, { join: CALL_JOIN.joins }] as Partial<PoseCtx>[]) for (const callN of [0, 1, 2]) {
    const R = run(who, 'pantHoot', 22, fps, { ...over, callN }); let ang = 0, pos = 0;
    for (let f = 1; f < R.n; f++) for (let ch = 0; ch < POSE_SIZE; ch++) {
      if (isSwitch(ch) || ch === PI.mouth || ch === PI.look) continue;
      const d = Math.abs(R.v[f * POSE_SIZE + ch] - R.v[(f - 1) * POSE_SIZE + ch]);
      if (ch < PI.root) ang = Math.max(ang, d); else if (ch < PI.root + 3 || (ch >= PI.ik && ch < PI.ik + 20)) pos = Math.max(pos, d);
    }
    // (The layer's pop guard starts a blend at 0.45 rad, or 0.15 body lengths of a limb's target, in one frame.)
    assert.ok(ang < 0.08, `animal ${who.id}, call ${callN}: the largest turn of a joint in one frame is ${ang.toFixed(3)} rad`);
    assert.ok(pos < 0.04, `animal ${who.id}, call ${callN}: the largest move of the hips or of a hand or foot target in one frame is ${pos.toFixed(3)} body lengths`);
  }
});

test('the mouth and the lips follow the parts of the call', () => {
  for (const who of [ROW[7], ROW[6], ROW[3]]) for (const callN of [0, 5]) {
    const c0 = ctxOf(who, 0, { callN }), st = callStyle(c0), at = (t: number) => { w.bind(pose).reset(); CLIPS.pantHoot(w, ctxOf(who, t, { callN })); return pose.v; };
    const span = (t0: number, t1: number) => { let lo = 1, hi = 0, fun = 0, k = 0; for (let t = t0; t < t1; t += 0.02) { const v = at(t); lo = Math.min(lo, v[PI.mouth]); hi = Math.max(hi, v[PI.mouth]); fun += v[PI.funnel]; k++; } return { lo, hi, funnel: fun / k }; };
    const intro = span(0.7, st.intro - 0.1), climax = span(st.intro + st.build + 0.35, st.intro + st.build + st.climax - 0.3), after = span(st.total + 1.2, st.total + 3);
    assert.ok(intro.funnel > 0.8 && intro.hi < 0.35 && intro.hi - intro.lo > 0.04, 'low hoos: the lips pushed forward, opening a little on each');
    assert.ok(climax.lo > 0.4 && climax.funnel < 0.3, `the climax: the mouth wide (${climax.lo.toFixed(2)}), the lips drawn back`);
    assert.ok(after.hi < 0.05 && after.funnel < 0.01, 'afterwards the mouth is shut');
    // The pants quicken through the build-up: more openings in its second half than in its first.
    const peaks = (t0: number, t1: number) => { let k = 0, was = false; for (let t = t0; t < t1; t += 0.01) { const o = at(t)[PI.mouth] > 0.2; if (o && !was) k++; was = o; } return k; };
    assert.ok(peaks(st.intro + st.build / 2, st.intro + st.build - 0.3) >= peaks(st.intro, st.intro + st.build / 2 - 0.3), 'the pants get faster');
    // The head comes up with the call and is held there against the look system through the build-up and the climax.
    assert.ok(at(st.intro + st.build + 0.5)[B.head * 3] < at(0.02)[B.head * 3] - 0.15); assert.ok(at(st.intro + st.build + 0.5)[PI.look] < -0.9); assert.ok(Object.is(at(st.total + 3)[PI.look], 0), 'afterwards the head is the look system\'s');
  }
  // A female's and a juvenile's mouth opens less wide than a vigorous male's.
  const wide = (who: Who, over: Partial<PoseCtx>) => { const st = callStyle(ctxOf(who, 0, over)); w.bind(pose).reset(); CLIPS.pantHoot(w, ctxOf(who, st.intro + st.build + st.climax / 2, over)); return pose.v[PI.mouth]; };
  assert.ok(wide(ROW[7], { rank: 1, arousal: 0.8 }) > wide(ROW[6], {}) + 0.05 && wide(ROW[7], { rank: 1, arousal: 0.8 }) > wide(ROW[3], {}) + 0.15);
});

test('a caller that joins enters at its own point; who began alone starts at the beginning', () => {
  const joiners = [1, 2, 3, 4, 5, 6, 7, 8].map(id => callStyle(ctxOf({ id, age: 25, male: true }, 0, { join: CALL_JOIN.joins })));
  assert.equal(new Set(joiners.map(s => s.enter.toFixed(2))).size, joiners.length, `eight joiners enter at eight points (${joiners.map(s => s.enter.toFixed(2)).join(' ')})`);
  assert.ok(Math.max(...joiners.map(s => s.enter)) - Math.min(...joiners.map(s => s.enter)) > 2, 'spread over more than two seconds of the sequence');
  for (const s of joiners) assert.ok(s.enter >= 0.6 * s.intro - 1e-9 && s.enter <= s.intro + 0.6 * s.build + 1e-9, 'between the last of the low hoos and six tenths of the build-up');
  for (const id of [1, 2, 3]) {
    const who = { id, age: 25, male: true }, alone = callStyle(ctxOf(who, 0)), ans = callStyle(ctxOf(who, 0, { join: CALL_JOIN.answers }));
    assert.equal(alone.enter, 0); assert.ok(ans.enter > 0 && ans.enter < alone.intro, 'an answer gives a shortened introduction');
    // The joiner's pose at its first frame is the lone caller's pose that far into the sequence.
    const j = callStyle(ctxOf(who, 0, { join: CALL_JOIN.joins })).enter;
    w.bind(pose).reset(); CLIPS.pantHoot(w, ctxOf(who, 0, { join: CALL_JOIN.joins })); const a = pose.v.slice();
    // (But for the breath in the chest, which is on the layer's clock.)
    w.bind(pose).reset(); CLIPS.pantHoot(w, ctxOf(who, j)); for (let i = 0; i < POSE_SIZE; i++) assert.ok(Math.abs(pose.v[i] - a[i]) < 0.03, `channel ${i}`);
    // No voice of its own (it drummed, or its call was over before the body got to it): it only listens.
    w.bind(pose).reset(); CLIPS.pantHoot(w, ctxOf(who, 1, { enter: CALL_QUIET })); assert.ok(pose.v[PI.mouth] < 0.06 && pose.v[PI.funnel] < 0.01 && (postureOf(pose.v) === Posture.seated || callSquat(hash01(id, 17), 25) > 0));
  }
  // Read from the simulation's list of calls (World.calls), in the order it gave them.
  const call = (callerId: number, time: number, x: number, radius = 1000, kind: Call['kind'] = 'pant-hoot'): Call => ({ id: 1e6 + callerId, kind, callerId, troopId: 0, position: [x, 0, 0], time, radius });
  assert.equal(callJoin([], 5), CALL_JOIN.none);
  assert.equal(callJoin([call(5, 10, 0)], 5), CALL_JOIN.none, 'alone');
  assert.equal(callJoin([call(5, 10, 0), call(6, 10, 5)], 5), CALL_JOIN.none, 'the first of one tick began it');
  assert.equal(callJoin([call(5, 10, 0), call(6, 10, 5)], 6), CALL_JOIN.joins, 'the second joins');
  assert.equal(callJoin([call(5, 10, 0), call(6, 10 + JOIN_H * 0.9, JOIN_NEAR_M - 1)], 6), CALL_JOIN.joins, 'one tick later, nearby');
  assert.equal(callJoin([call(5, 10, 0), call(6, 10 + JOIN_H * 0.9, JOIN_NEAR_M + 1)], 6), CALL_JOIN.answers, 'further off: an answer');
  assert.equal(callJoin([call(5, 10, 0), call(6, 10 + ANSWER_H * 0.9, 3)], 6), CALL_JOIN.answers, 'later: an answer');
  assert.equal(callJoin([call(5, 10, 0), call(6, 10 + ANSWER_H * 1.1, 3)], 6), CALL_JOIN.none, 'too long ago');
  assert.equal(callJoin([call(5, 10, 0, 36), call(6, 10, 400)], 6), CALL_JOIN.none, 'a call it could not hear');
  assert.equal(callJoin([call(5, 10, 0, 1000, 'drum'), call(6, 10, 4)], 6), CALL_JOIN.none, 'drumming is not a pant-hoot');
  assert.equal(callJoin([call(6, 9, 4), call(5, 10 - ANSWER_H / 2, 0), call(6, 10, 4)], 6), CALL_JOIN.answers, 'its own latest call is the one asked about');
  // How far into a call the layer is when it first draws it, and the call's number.
  assert.ok(callAge(10 + 0.75 / 60, 0.75 / 60, 10, 1) < 1e-6); assert.ok(Math.abs(callAge(10 + 0.75 / 60, 0.75 / 60, 10 + 20 / 3600, 1) - 20) < 1e-6); assert.ok(Math.abs(callAge(10 + 0.75 / 60, 0.75 / 60, 10 + 15 / 3600, 60) - 0.25) < 1e-6); assert.equal(callAge(1e9, 0.0125, 5, 1), 0);
  assert.equal(callNumber(10.5), callNumber(10.5)); assert.notEqual(callNumber(10.5), callNumber(10.5 + 1 / 240)); assert.ok(Number.isInteger(callNumber(1e9)) && callNumber(1e9) >= 0);
});

test('a pant-hoot given during another act: the face follows the call and comes in without a step', () => {
  const who = ROW[7], seat = () => { w.bind(pose).reset(); CLIPS.sitIdle(w, ctxOf(who, 3, { vocal: null })); return pose.v; };
  const plain = seat().slice();
  // Nothing of it at amount 0; the clip's own call is not doubled.
  seat(); vocalOverlay(w, 'pant-hoot', 0, 'excited', ctxOf(who, 3), 2, 0); assert.deepEqual([...pose.v], [...plain]);
  seat(); vocalOverlay(w, 'pant-hoot', 0, 'excited', ctxOf(who, 3)); assert.deepEqual([...pose.v], [...plain]);
  // At full amount: the lips forward in the low hoos, the mouth wide at the climax, shut after; the head half as far up as in the clip.
  const st = callStyle(ctxOf(who, 0));
  const face = (tau: number, k = 1) => { seat(); vocalOverlay(w, 'pant-hoot', 0, 'excited', ctxOf(who, 3), tau, k); return pose.v; };
  assert.ok(face(1.2)[PI.funnel] > 0.8 && face(st.intro + st.build + st.climax / 2)[PI.mouth] > 0.4 && face(st.total + 2)[PI.mouth] === plain[PI.mouth]);
  assert.ok(face(st.intro + st.build + 0.5)[B.head * 3] < plain[B.head * 3] - 0.1);
  // Eased in by the layer (amount 0 to 1 over a few frames) nothing jumps; it used to tip the head back 0.45 rad in one frame.
  let last = plain, worst = 0; for (let f = 1; f <= 30; f++) { const v = face(st.intro + 1 + f / 60, f / 30).slice(); for (const b of [B.neck, B.head]) worst = Math.max(worst, Math.abs(v[b * 3] - last[b * 3])); last = v; }
  assert.ok(worst < 0.03, `the head moves ${worst.toFixed(3)} rad a frame at most while the face comes in`);
  // Without a context: as before this stage (the harness's sheet of faces).
  seat(); vocalOverlay(w, 'pant-hoot', 0.1, 'calm'); assert.ok(Math.abs(pose.v[PI.funnel] - 0.85) < 1e-6 && Math.abs(pose.v[B.neck * 3] - (plain[B.neck * 3] - 0.25)) < 1e-6);
});

// ---- The builder ----
/** One whole building of animal `id` at `rate` simulated seconds per real second, at 60 frames a second: the drawn turn every frame. */
function building(id: number, rate: number, finishS = 240, tailS = 4) {
  const s = nestTurnState(), F = 60, h: number[] = [0], ks: number[] = [0], RAMP = 30, real = (finishS + RAMP) / rate, n = Math.ceil((real + tailS) * F);
  nestTurnReset(s);
  for (let f = 1; f <= n; f++) { const sim = f / F * rate, k = sim >= finishS + RAMP ? 1 : sim >= finishS ? NEST_HOLD_K + (1 - NEST_HOLD_K) * (sim - finishS) / RAMP : Math.min(NEST_HOLD_K, sim / NEST_BUILD_S); nestTurnStep(s, id, k, 1 / F, rate); h.push(s.h); ks.push(k); }
  let path = 0, inOne = 0, quarter = 0, after = 0;
  for (let f = 1; f < h.length; f++) { path += Math.abs(h[f] - h[f - 1]); if (ks[f - 1] >= 1) after += Math.abs(h[f] - h[f - 1]); }
  const acc: number[] = [0]; for (let f = 1; f < h.length; f++) acc.push(acc[f - 1] + Math.abs(h[f] - h[f - 1]));
  for (let f = 0; f < h.length; f++) { inOne = Math.max(inOne, acc[f] - acc[Math.max(0, f - F)]); if (f >= 15) quarter = Math.max(quarter, (acc[f] - acc[f - 15]) / 0.25); }
  return { turns: s.n, path, inOne, quarter, after, end: s.h, asked: s.turn, real };
}
test('a builder turns no faster than a turn is read, at every speed, and makes the turns a watcher has the time for', () => {
  assert.equal(NEST_TURN_MAX, 0.9, 'the layer\'s own figure for a turn too fast to make on the spot (creatures.ts: a standing animal steps round above it)');
  const IDS = Array.from({ length: 49 }, (_, i) => i + 1);
  for (const [name, rate] of [['Real time', 1], ['Watch 4x', 4], ['1 min/s', 60], ['10 min/s', 600], ['1 h/s', 3600]] as const) {
    const all = IDS.map(id => building(id, rate));
    for (const b of all) {
      // Registered (section 0.5, items 7 to 9). Before: 2.3 to 6.3 rad in a second, 8.6 to 15.6 rad/s over a quarter second, 1.3 rad after lying down.
      assert.ok(b.inOne <= NEST_TURN_MAX + 1e-9, `${name}: the heading travels ${b.inOne.toFixed(2)} rad in one second`);
      assert.ok(b.quarter <= NEST_TURN_MAX + 1e-9, `${name}: ${b.quarter.toFixed(2)} rad/s over its fastest quarter second`);
      assert.ok(b.after < 0.2, `${name}: ${b.after.toFixed(2)} rad after it lies down (it sleeps facing as it last sat)`);
      assert.ok(Math.abs(b.end - b.asked) < 0.05, 'and it has come to rest on its facing');
    }
    const turns = all.map(b => b.turns);
    if (rate === 1) assert.ok(turns.filter(t => t === NEST_TURNS - 1).length >= 0.9 * IDS.length, `Real time: ${turns.filter(t => t === 4).length} of 49 builders still face five ways`);
    if (rate === 4) assert.ok(median(turns) >= 3, `Watch 4x: ${median(turns)} turns in the minute a building lasts`);
    if (rate === 60) { assert.ok(turns.every(t => t <= 1), '1 min/s: at most one turn'); assert.ok(turns.filter(t => t === 1).length > 25, 'and most make it when they are seen from the start'); for (const b of all) assert.ok(b.path <= 1.5, `1 min/s: the heading travels ${b.path.toFixed(2)} rad in a building (it was 7.4 to 12.5)`); }
    if (rate >= 600) for (const b of all) assert.ok(b.turns === 0 && b.path === 0, `${name}: no turn`);
  }
  // The same builder, the same building: the same turns.
  assert.deepEqual(building(7, 4), building(7, 4));
  // First seen part-way through, the turns already past are not made now; first seen asleep, it has not turned.
  { const s = nestTurnState(); nestTurnStep(s, 5, 0.95, 1 / 60, 1); assert.equal(s.turn, 0); assert.equal(s.i, NEST_TURNS);
    const p = nestTurnState(); nestTurnStep(p, 5, nestTurnAt(5, 2) + 0.01, 1 / 60, 1); assert.equal(p.turn, 0); assert.equal(p.i, 3);
    const q = nestTurnState(); for (let f = 0; f < 600; f++) nestTurnStep(q, 5, 1, 1 / 60, 60); assert.ok(q.h === 0 && q.n === 0); }
  // A change of speed in the middle of a building makes no jump.
  { const s = nestTurnState(); let last = 0, worst = 0; for (let f = 0; f < 60 * 30; f++) { const rate = f < 600 ? 1 : f < 700 ? 600 : 4, k = Math.min(0.9, f / (60 * 30)); nestTurnStep(s, 9, k, 1 / 60, rate); worst = Math.max(worst, Math.abs(s.h - last)); last = s.h; } assert.ok(worst <= NEST_TURN_MAX / 60 + 1e-9); }
});

test('a turn eases in and out, never passes its mark, and takes the short way round', () => {
  const s = { h: 0, v: 0 }; let peak = 0, past = 0, t99 = -1;
  for (let f = 0; f < 60 * 12; f++) { const before = s.h; slewTurn(s, 1.9, 1 / 60); peak = Math.max(peak, (s.h - before) * 60); past = Math.max(past, s.h - 1.9); if (t99 < 0 && s.h > 1.9 * 0.99) t99 = f / 60; }
  assert.ok(peak <= NEST_TURN_MAX + 1e-9 && peak > 0.85, `a turn of 1.9 rad peaks at ${peak.toFixed(2)} rad/s`); assert.ok(past <= 1e-9, 'it does not swing past'); assert.ok(t99 > 2.5 && t99 < 7, `and takes ${t99.toFixed(1)} s`);
  // Uneven frames change nothing about the limit.
  const u = { h: 0, v: 0 }; let worst = 0, lcg = 7; for (let f = 0; f < 400; f++) { lcg = (lcg * 1103515245 + 12345) & 0x7fffffff; const dt = 0.008 + 0.05 * lcg / 0x7fffffff, before = u.h; slewTurn(u, -2.2, dt); worst = Math.max(worst, Math.abs(u.h - before) / dt); }
  assert.ok(worst <= NEST_TURN_MAX + 1e-9 && Math.abs(u.h + 2.2) < 0.01);
  // The layer's follower: a heading that wraps goes the short way, under the same limit.
  const hs = { v: 0 }; let h = 3.0, peakH = 0; for (let f = 0; f < 60 * 6; f++) { const b = h; h = slewHeading(hs, h, -3.0, 1 / 60); peakH = Math.max(peakH, Math.abs(h - b) * 60); }
  assert.ok(Math.abs(Math.atan2(Math.sin(h + 3.0), Math.cos(h + 3.0))) < 0.01 && h > 3.0, 'from 3.0 to -3.0 rad the short way is 0.28 rad on, not 6 rad back'); assert.ok(peakH <= NEST_TURN_MAX + 1e-9);
  slewTurn(s, 5, 0); assert.ok(Number.isFinite(s.h));
});

/** Reaches of a builder over `seconds` of the clip: the times a hand's target first goes above 0.45 body lengths. */
function reaches(id: number, seconds: number, over: Partial<PoseCtx>): number[] {
  const out: number[] = []; let up = false;
  for (let t = 0; t < seconds; t += 1 / 60) { w.bind(pose).reset(); CLIPS.nestBuild(w, ctxOf({ id, age: 20, male: true }, t, { inTree: true, vocal: null, mood: 'calm', ...over })); const r = Math.max(pose.v[PI.ik + LIMB.armL * 5 + 1], pose.v[PI.ik + LIMB.armR * 5 + 1]) > 0.45; if (r && !up) out.push(t); up = r; }
  return out;
}
test('a building that lasts a few seconds is one reach or two, begun at each builder\'s own moment; a long one is stage W12\'s', () => {
  const IDS = Array.from({ length: 49 }, (_, i) => i + 1), first: number[] = [];
  let two = 0;
  for (const id of IDS) {
    const r = reaches(id, 4, { span: 4 }); first.push(r[0]);
    assert.ok(r.length >= 1 && r.length <= 2, `1 min/s: builder ${id} makes ${r.length} reaches in the four seconds`); if (r.length === 2) two++;
    assert.equal(reaches(id, 0.4, { span: 0.4 }).length, 0, '10 min/s: no reach in four tenths of a second');
    // At the end of a brief building the hands are in the lap (it settles).
    w.bind(pose).reset(); CLIPS.nestBuild(w, ctxOf({ id, age: 20, male: true }, 3.95, { inTree: true, span: 4 })); assert.ok(Math.max(pose.v[PI.ik + 1], pose.v[PI.ik + 6]) < 0.3, `builder ${id} has its hands down at the end`);
    // Watch 4x and Real time: bars, as stage W12 drew them.
    assert.deepEqual(reaches(id, 20, { span: 60 }), reaches(id, 20, {})); if (id <= 12) assert.ok(reaches(id, 60, { span: 240 }).length >= 3);
  }
  assert.ok(two > 15 && two < 40, `${two} of 49 make a second reach`);
  assert.ok(Math.max(...first) - Math.min(...first) > 0.4 && new Set(first.map(x => x.toFixed(2))).size > 12, 'they do not begin together');
  assert.ok(NEST_BRIEF_S > 4 && NEST_BRIEF_S < 60);
});

// ---- The loops ----
test('feeding in a crown: each feeder has its own order and length of steps, and no two match at any shift', () => {
  const eight = [1, 2, 3, 4, 5, 6, 7, 8].map(id => ({ id, age: 20, male: true }));
  // The order of steps over the first twenty cycles: what each cycle is and how many picks it has.
  const orders = eight.map(who => { const s = hash01(who.id, 17); return Array.from({ length: 20 }, (_, n) => { const p = feedPlan(n + 2, s); return `${p.kind}${p.picks}${p.gap.some(g => g > 0) ? 'p' : ''}`; }).join(' '); });
  assert.equal(new Set(orders).size, orders.length, 'no two feeders have the same order of steps');
  for (const who of eight) {
    const s = hash01(who.id, 17), plans = Array.from({ length: 200 }, (_, n) => feedPlan(n + 2, s)), lens = plans.map(p => p.len), kinds = new Set(plans.map(p => p.kind));
    assert.ok(Math.max(...lens) - Math.min(...lens) > 4, `feeder ${who.id}: its cycles last ${Math.min(...lens).toFixed(1)} to ${Math.max(...lens).toFixed(1)} s`);
    assert.ok(kinds.has(FEED.cluster) && kinds.has(FEED.pluck) && kinds.has(FEED.look), `feeder ${who.id} takes clusters, reaches into the leaves, and looks round (${[...kinds]})`);
    assert.ok(plans.filter(p => p.kind === FEED.cluster).length > 100, 'mostly clusters');
    // The plan is the cycle the clock cuts: each cycle begins where the last one ended.
    for (let n = 1; n < plans.length; n++) assert.ok(Math.abs(plans[n].start - plans[n - 1].start - plans[n - 1].len) < 1e-9 && plans[n].len > 3);
  }
  // Registered (section 0.5, item 10): over two minutes, at the best shift within 15 s, the movement of two feeders
  // correlates at most 0.3 on the median pair and no pair is over 0.7 (it was 0.42, and 9 of 28 pairs over 0.7).
  const rb = bestShift(eight.map(who => run(who, 'forage', 120, 8, { inTree: true, vocal: null, mood: 'calm' })), 15);
  // (Held here with a little room: the stage's audit reads the registered figures at its own sampling.)
  assert.ok(median(rb) <= 0.36, `feeders at the best shift: median ${median(rb).toFixed(2)} (it was 0.42)`);
  assert.ok(Math.max(...rb) <= 0.72, `the closest pair ${Math.max(...rb).toFixed(2)} (it was 0.94)`);
  // Nothing jumps from one cycle to the next, or anywhere: the largest change of a hand's target in one frame.
  for (const who of eight.slice(0, 4)) { const R = run(who, 'forage', 90, 60, { inTree: true, vocal: null, mood: 'calm' }); let step = 0; for (let f = 1; f < R.n; f++) for (let l = 0; l < 2; l++) for (let k = 0; k < 3; k++) step = Math.max(step, Math.abs(R.v[f * POSE_SIZE + PI.ik + l * 5 + k] - R.v[(f - 1) * POSE_SIZE + PI.ik + l * 5 + k])); assert.ok(step < 0.045, `feeder ${who.id}: a hand's target moves ${step.toFixed(3)} body lengths in one frame at most`); }
});

test('the leaf sponge and the lips: no two drinkers keep one loop', () => {
  const all = Array.from({ length: 49 }, (_, i) => ({ id: i + 1, age: 20, male: true })), sponge = all.filter(x => drinksWithSponge(hash01(x.id, 17)));
  assert.ok(sponge.length >= 10);
  // Registered (item 11): over two minutes, at the best shift within 6 s, no pair over 0.6 (it was 0.985, six pairs over 0.5).
  const rb = bestShift(sponge.map(who => run(who, 'drink', 120, 10, { vocal: null, mood: 'calm' })), 6);
  assert.ok(Math.max(...rb) <= 0.6, `sponge drinkers at the best shift: the closest pair ${Math.max(...rb).toFixed(2)}, median ${median(rb).toFixed(2)}`);
  // One drinker's dips differ in length, some bars have no dip, and the hand never jumps.
  for (const who of sponge.slice(0, 5)) {
    const R = run(who, 'drink', 120, 60, { vocal: null, mood: 'calm' }), y = (f: number) => R.v[f * POSE_SIZE + PI.ik + LIMB.armR * 5 + 1];
    const dips: number[] = []; let low = false, step = 0; for (let f = 1; f < R.n; f++) { const l = y(f) < 0.2; if (l && !low) dips.push(f / 60); low = l; step = Math.max(step, Math.abs(y(f) - y(f - 1))); }
    const gaps = dips.slice(1).map((x, i) => x - dips[i]);
    assert.ok(dips.length > 15 && Math.max(...gaps) - Math.min(...gaps) > 1.5, `drinker ${who.id}: ${dips.length} dips, ${Math.min(...gaps).toFixed(1)} to ${Math.max(...gaps).toFixed(1)} s apart`);
    assert.ok(step < 0.045, `the sponge moves ${step.toFixed(3)} body lengths in one frame at most`);
  }
  // A drinker at the water lifts its head now and then, at its own moments, and is on all fours throughout.
  const lips = all.filter(x => !drinksWithSponge(hash01(x.id, 17))).slice(0, 6), ups = lips.map(who => { const R = run(who, 'drink', 60, 20, { vocal: null, mood: 'calm' }), out: number[] = []; let up = false; for (let f = 0; f < R.n; f++) { const u = R.v[f * POSE_SIZE + B.head * 3] < 0.2; if (u && !up) out.push(f / 20); up = u; assert.equal(postureOf(R.v.subarray(f * POSE_SIZE, (f + 1) * POSE_SIZE)), Posture.quad); } return out; });
  for (const u of ups) assert.ok(u.length >= 3 && u.length <= 12, `it looks up ${u.length} times in a minute`);
  assert.ok(Math.max(...ups.map(u => u[0])) - Math.min(...ups.map(u => u[0])) > 1, 'not together');
});

test('builders: the bars are spread, each bar is its own length, and no two builders reach on one beat', () => {
  const IDS = Array.from({ length: 49 }, (_, i) => i + 1), bars = IDS.map(id => nestBar(hash01(id, 17)));
  assert.ok(bars.every(p => p >= NEST_BAR_S[0] && p <= NEST_BAR_S[1]) && NEST_BAR_S[1] - NEST_BAR_S[0] >= 2.5 && NEST_BAR_JITTER > 0.1 && NEST_BAR_JITTER < 0.5);
  let near = 0; const pairs: [number, number][] = [];
  for (let i = 0; i < 49; i++) for (let j = i + 1; j < 49; j++) if (Math.abs(bars[i] - bars[j]) < 0.1) { near++; pairs.push([i, j]); }
  // Registered (item 12): at most 110 of the 1,176 pairs within a tenth of a second (it was 143).
  assert.ok(near <= 110, `${near} of 1176 pairs of builders have mean bars within 0.1 s of each other`);
  // The higher hand's height over a minute, at the best shift within 6 s: no pair over 0.6 (it was six, all of them pairs of nearly one bar).
  const fps = 10, S = 60, n = S * fps, hi = IDS.map(id => { const out = new Float32Array(n); for (let f = 0; f < n; f++) { w.bind(pose).reset(); CLIPS.nestBuild(w, ctxOf({ id, age: 20, male: true }, f / fps, { inTree: true, vocal: null, mood: 'calm' })); out[f] = Math.max(pose.v[PI.ik + 1], pose.v[PI.ik + 6]); } return out; });
  const c1 = (a: Float32Array, b: Float32Array, lag: number) => { let sa = 0, sb = 0, m = 0; const f0 = Math.max(0, lag), f1 = Math.min(n, n + lag); for (let f = f0; f < f1; f++) { sa += a[f]; sb += b[f - lag]; m++; } sa /= m; sb /= m; let ab = 0, aa = 0, bb = 0; for (let f = f0; f < f1; f++) { const x = a[f] - sa, y = b[f - lag] - sb; ab += x * y; aa += x * x; bb += y * y; } return aa > 1e-9 && bb > 1e-9 ? ab / Math.sqrt(aa * bb) : 0; };
  let worst = 0, over = 0;
  for (let i = 0; i < 49; i++) for (let j = i + 1; j < 49; j++) { let best = -1; for (let lag = -6 * fps; lag <= 6 * fps; lag++) best = Math.max(best, c1(hi[i], hi[j], lag)); worst = Math.max(worst, best); if (best > 0.6) over++; }
  // (Held with a little room; the audit reads the registered figure. It was six pairs over 0.6, the closest 0.78.)
  assert.ok(over <= 3 && worst < 0.72, `${over} pairs of builders over 0.6 at the best shift, the closest ${worst.toFixed(2)}`);
  // One builder's gaps between reaches differ by seconds.
  for (const id of [1, 2, 3, 4, 5]) { const r = reaches(id, 120, {}), g = r.slice(1).map((x, i) => x - r[i]); assert.ok(g.length > 12 && Math.max(...g) - Math.min(...g) > 2, `builder ${id}: reaches ${Math.min(...g).toFixed(1)} to ${Math.max(...g).toFixed(1)} s apart`); }
});

test('the same animal gives the same call, building and meal on every run; nothing draws from Math.random', async () => {
  const cases: [string, Partial<PoseCtx>][] = [['pantHoot', {}], ['pantHoot', { rank: 1, arousal: 0.9, callN: 3 }], ['pantHoot', { inTree: true, join: CALL_JOIN.joins }], ['pantHoot', { role: CALL_BASE.quad, callN: 2 }],
    ['forage', { inTree: true, vocal: null }], ['drink', { vocal: null }], ['nestBuild', { inTree: true, vocal: null }], ['nestBuild', { inTree: true, vocal: null, span: 4 }]];
  for (const [clip, over] of cases) for (const who of [ROW[7], ROW[6], { id: 21, age: 20, male: true }, { id: 33, age: 30, male: false }]) {
    const a = run(who, clip, 30, 10, over); run({ ...who, id: who.id + 1 }, clip, 2, 10, over); const b = run(who, clip, 30, 10, over);
    assert.deepEqual(a.v, b.v, `${clip}, animal ${who.id}`); assert.ok(a.v.every(Number.isFinite));
  }
  const { readFileSync } = await import('node:fs');
  for (const f of ['call.ts', 'poses.ts', 'perch.ts']) assert.ok(!/Math\.random/.test(readFileSync(new URL(`../src/render/creatures/${f}`, import.meta.url), 'utf8')), `${f} has no Math.random`);
});
