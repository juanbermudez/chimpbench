import assert from 'node:assert/strict';
import test from 'node:test';
import { CLIPS, FORAGE_BAR_S, GROOMEE, GROOM_FRONT, GROOM_HIGH, GROOM_LAP, NEST_BAR_S, NEST_BEAT, NEST_LOOK_SHARE, NEST_PRESS_SHARE, Pw, barProgress, nestArm, nestBar, nestBeat, ownClock, ownTempo, type PoseCtx } from '../src/render/creatures/poses';
import { B, BONES, LIMB, PI, POSE_SIZE, createPose } from '../src/render/creatures/rig';
import { hash01 } from '../src/render/creatures/util';
import { limbPhase } from '../src/render/creatures/gait';
import { Listen } from '../src/render/creatures/patrol';
import { NEST_BUILD_S, NEST_HOLD_K, NEST_TURNS, NEST_TURN_RAD, NEST_TURN_SHIFT, PERCH, nestProgress, nestTurn, nestTurnAt } from '../src/render/creatures/perch';
import { IDLE, IDLE_SETTLE, IDLE_SETTLE_SPREAD, createIdle, idleBit, idleSettle, idleStep } from '../src/render/creatures/secondary';
import { Posture, postureOf } from '../src/render/creatures/intention';
import { createWorld } from '../src/simulation';

// Stage W12 (docs/staging/w12-out-of-step.md), "out of step". The user saw every nesting animal make the same movement
// at the same instant. A clip's cycle ran on the clip's own clock, which has nothing of the animal in it, so animals
// that entered a clip in the same frame moved as one; and a new world drew a whole community building nests it was
// asleep in. These tests hold what the stage registered: two animals with different ids that enter a clip in the
// same frame are out of step (in rhythm, not only in phase), the same animal moves the same way on every run, a nest
// the simulation has finished has a sleeper in it, and animals released together do not start an idle event together.
// Everything here is a stylization: the tests say that neighbours differ, not how a chimpanzee moves.

const CLOCK0 = 1000;   // the layer's animation clock when the animals enter the clip (shared by all of them)
interface Variant { clip: string; role?: number; inTree?: boolean; pair?: boolean; gait?: number; stage?: PoseCtx['stage']; age?: number }
/** The pose context of animal `id`, `t` seconds after it entered the clip, as src/render/creatures.ts evaluatePose builds it. */
function ctxOf(id: number, t: number, v: Variant, partner = id + 1): PoseCtx {
  const clock = CLOCK0 + t, time = clock + hash01(id, 13) * 100, ph = hash01(id, 3) + (v.gait ?? 0) * t, pairSeed = hash01(Math.min(id, partner) * 7 + Math.max(id, partner), 5);
  return {
    t, freq: v.gait ?? 0, time, phase: ph - Math.floor(ph), speedU: v.gait ? 0.8 : 0, seed: hash01(id, 17), stage: v.stage ?? 'adult', male: true, age: v.age ?? 20, injury: 0, mood: 'calm', energy: 0.8,
    vocal: null, hasTarget: !!v.pair, tx: 0.1, ty: 0, tz: 0.9, tdist: 0.9, tsize: 1, role: v.role ?? 0, inTree: !!v.inTree, wet: 0, stride: 0, lp: limbPhase(hash01(id, 19), ph), lapse: 0, settle: 0,
    pb: new Float32Array(15), hasBones: false, pairT: v.pair ? clock + pairSeed * 40 : time, pairSeed: v.pair ? pairSeed : hash01(id, 17), side: 1, bears: 0,
  };
}
const pose = createPose(), w = new Pw();
/** The clip's pose buffer for `frames` frames at `fps`; the hand props ride in two extra channels. */
function run(id: number, v: Variant, frames: number, fps: number): Float32Array {
  const N = POSE_SIZE + 2, out = new Float32Array(frames * N);
  for (let f = 0; f < frames; f++) { w.bind(pose).reset(); CLIPS[v.clip](w, ctxOf(id, f / fps, v)); out.set(pose.v, f * N); out[f * N + POSE_SIZE] = pose.propL; out[f * N + POSE_SIZE + 1] = pose.propR; }
  return out;
}
// The left-right mirror of a pose: two animals doing the same thing with opposite arms are in step to the eye.
const MIRROR = new Int32Array(POSE_SIZE), SIGN = new Float32Array(POSE_SIZE).fill(1);
{
  for (let i = 0; i < POSE_SIZE; i++) MIRROR[i] = i;
  const other = (n: string) => n.endsWith('L2') ? n.slice(0, -2) + 'R2' : n.endsWith('R2') ? n.slice(0, -2) + 'L2' : n.endsWith('L') ? n.slice(0, -1) + 'R' : n.endsWith('R') ? n.slice(0, -1) + 'L' : n;
  (BONES as readonly string[]).forEach((n, i) => { const j = (B as Record<string, number>)[other(n)] ?? i; for (let k = 0; k < 3; k++) { MIRROR[i * 3 + k] = j * 3 + k; if (k > 0) SIGN[i * 3 + k] = -1; } });
  SIGN[PI.root] = -1;
  const sw = [LIMB.armR, LIMB.armL, LIMB.legR, LIMB.legL];
  for (let l = 0; l < 4; l++) { for (let k = 0; k < 5; k++) MIRROR[PI.ik + l * 5 + k] = PI.ik + sw[l] * 5 + k; SIGN[PI.ik + l * 5] = -1; MIRROR[PI.contact + l] = PI.contact + sw[l]; }
}
const isSwitch = (ch: number) => (ch >= PI.ik && ch < PI.ik + 20 && (ch - PI.ik) % 5 >= 3) || (ch >= PI.contact && ch < PI.contact + 4) || ch === PI.ground;
/** Every moving channel with its own mean removed (plain and mirrored), and the largest range of any channel. */
function centred(x: Float32Array, frames: number, mirror: boolean): { c: Float32Array; moves: number } {
  const N = POSE_SIZE + 2, c = new Float32Array(frames * POSE_SIZE); let moves = 0;
  for (let ch = 0; ch < POSE_SIZE; ch++) {
    if (isSwitch(ch)) continue;
    const src = mirror ? MIRROR[ch] : ch, s = mirror ? SIGN[ch] : 1;
    let m = 0, lo = Infinity, hi = -Infinity;
    for (let f = 0; f < frames; f++) { const y = x[f * N + src] * s; m += y; if (y < lo) lo = y; if (y > hi) hi = y; }
    m /= frames; if (hi - lo > moves) moves = hi - lo;
    if (hi - lo < 1e-6) continue;
    for (let f = 0; f < frames; f++) c[f * POSE_SIZE + ch] = x[f * N + src] * s - m;
  }
  return { c, moves };
}
/** Correlation of two animals' movement, pooled over channels and frames, with b shifted by `lag` frames. */
function corr(a: Float32Array, b: Float32Array, frames: number, lag: number): number {
  let sab = 0, saa = 0, sbb = 0;
  for (let f = Math.max(0, lag); f < Math.min(frames, frames + lag); f++) { const oa = f * POSE_SIZE, ob = (f - lag) * POSE_SIZE; for (let ch = 0; ch < POSE_SIZE; ch++) { const p = a[oa + ch], q = b[ob + ch]; sab += p * q; saa += p * p; sbb += q * q; } }
  return saa > 1e-12 && sbb > 1e-12 ? sab / Math.sqrt(saa * sbb) : 0;
}
const median = (x: number[]) => x.slice().sort((p, q) => p - q)[Math.floor(x.length / 2)];
/**
 * The registered measure (section 0.1 of the stage document) for animals `ids` entered in the same frame: per pair,
 * r0 (their movement at the same instant; the larger of the plain and the mirrored comparison) and, with `lagS`, the
 * same at the best shift within that many seconds; whether any pair is identical; the mean difference of the poses.
 */
function together(v: Variant, ids: number[], seconds: number, fps: number, lagS = 0) {
  const frames = Math.round(seconds * fps), N = POSE_SIZE + 2, runs = ids.map(id => run(id, v, frames, fps));
  const plain = runs.map(r => centred(r, frames, false)), mir = runs.map(r => centred(r, frames, true));
  const r0: number[] = [], rBest: number[] = []; let identical = 0, apart = Infinity;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    let d = 0, sum = 0, moving = 0;
    for (let ch = 0; ch < N; ch++) { let any = false, part = 0; for (let f = 0; f < frames; f++) { const p = runs[i][f * N + ch], q = runs[j][f * N + ch], e = Math.abs(p - q); if (e > d) d = e; part += e; if (p !== runs[i][ch] || q !== runs[j][ch]) any = true; } if (any) { moving++; sum += part; } }
    if (d < 1e-6) identical++;
    // How far apart the two poses are on average, over the channels that move, as a share of the clip's largest movement.
    apart = Math.min(apart, moving ? sum / (frames * moving) / Math.max(plain[i].moves, plain[j].moves, 1e-9) : 0);
    const z = Math.max(corr(plain[i].c, plain[j].c, frames, 0), corr(plain[i].c, mir[j].c, frames, 0)); let best = z;
    for (let lag = -Math.round(lagS * fps); lagS > 0 && lag <= Math.round(lagS * fps); lag += 2) best = Math.max(best, corr(plain[i].c, plain[j].c, frames, lag), corr(plain[i].c, mir[j].c, frames, lag));
    r0.push(z); rBest.push(best);
  }
  return { r0: median(r0), rBest: median(rBest), identical, moves: Math.max(...plain.map(p => p.moves)), apart };
}
const SOLO = [1, 2, 3, 4, 5, 6, 7, 8], ACTORS = [1, 3, 5, 7];   // four pairs: (1,2) (3,4) (5,6) (7,8), the odd one acts

// The clips that were in step, or on one loop for every animal, before the stage (section 0.3 of the stage document).
const OUT_OF_STEP: [string, Variant][] = [
  ['nestBuild', { clip: 'nestBuild', inTree: true }],
  ['play, an infant alone', { clip: 'play', stage: 'infant', age: 2 }],
  ['wrestle, on top', { clip: 'wrestle', role: 0, pair: true }], ['wrestle, under', { clip: 'wrestle', role: 1, pair: true }], ['tickle', { clip: 'tickle', pair: true }],
  ['display', { clip: 'display' }], ['charge', { clip: 'charge' }], ['pantGrunt', { clip: 'pantGrunt', pair: true }], ['drum', { clip: 'drum' }], ['mate, the male', { clip: 'mate', role: 0, pair: true }],
  ['attack', { clip: 'attack', pair: true }], ['defend', { clip: 'defend', pair: true }],
  ['forage on the ground', { clip: 'forage' }], ['share', { clip: 'share', pair: true }],
  ['groom, from behind', { clip: 'groom', role: 0, pair: true }], ['groom, mutual', { clip: 'groom', role: 1, pair: true }], ['groom, an infant held', { clip: 'groom', role: GROOM_LAP, pair: true }],
  ['groom, from the front', { clip: 'groom', role: GROOM_FRONT, pair: true }], ['groom, the shoulders', { clip: 'groom', role: GROOM_HIGH, pair: true }],
  ['alarm', { clip: 'alarm' }], ['listen, sniffing', { clip: 'listen', role: Listen.sniff }],
  // Stage W14, second reader: sheltering from a storm (a slow sway at each animal's own tempo).
  ['shelter', { clip: 'shelter' }], ['shelter in a crown', { clip: 'shelter', inTree: true }],
];

test('animals that enter a clip in the same frame do not move in step', () => {
  for (const [name, v] of OUT_OF_STEP) {
    const ids = v.pair ? ACTORS : SOLO, now = together(v, ids, 30, 15);
    assert.equal(now.identical, 0, `${name}: no two animals make the very same movement`);
    assert.ok(now.moves > 0.015, `${name} moves (${now.moves})`);
    assert.ok(now.apart > 0.004, `${name}: over the run the two poses are apart by ${(100 * now.apart).toFixed(2)}% of the clip's largest movement on average`);
    assert.ok(now.r0 <= 0.6, `${name}: at the same instant the movement of two animals correlates ${now.r0.toFixed(3)} (median over pairs; it was 0.6 to 1.0)`);
  }
});

test('nor on one rhythm started apart: their tempo differs', () => {
  // Over two minutes, at the best shift within six seconds (two metronomes at one tempo read 1 here however far apart they start).
  for (const [name, v] of OUT_OF_STEP) {
    const r = together(v, v.pair ? ACTORS : SOLO, 120, 10, 6);
    assert.ok(r.rBest <= 0.85, `${name}: at the best shift the movement of two animals correlates ${r.rBest.toFixed(3)} (median over pairs; it was 0.94 to 1.0)`);
  }
  // Solo play has two variants by animal (on the back, or bouncing): animals in the same variant are out of step too.
  const kickers = SOLO.concat([9, 10, 11, 12, 13, 14, 15, 16]).filter(id => hash01(id, 17) > 0.5).slice(0, 5), bouncers = SOLO.concat([9, 10, 11, 12, 13, 14, 15, 16]).filter(id => hash01(id, 17) <= 0.5).slice(0, 5);
  assert.ok(kickers.length >= 4 && bouncers.length >= 4);
  for (const ids of [kickers, bouncers]) { const r = together({ clip: 'play' }, ids, 60, 10, 6); assert.ok(r.r0 <= 0.6 && r.rBest <= 0.85, `solo play: ${r.r0.toFixed(3)} at the same instant, ${r.rBest.toFixed(3)} at the best shift`); }
});

test('drinkers: the lips and the leaf sponge are each animal\'s own', () => {
  const all = Array.from({ length: 40 }, (_, i) => i + 1), lips = all.filter(id => hash01(id, 17) <= 0.7).slice(0, 6), sponge = all.filter(id => hash01(id, 17) > 0.7).slice(0, 6);
  assert.ok(lips.length === 6 && sponge.length >= 4);
  // The lips at the water: only the mouth moves. Two drinkers used to be identical in every frame.
  const mouth = (id: number) => { const out: number[] = []; for (let f = 0; f < 600; f++) { w.bind(pose).reset(); CLIPS.drink(w, ctxOf(id, f / 20, { clip: 'drink' })); out.push(pose.v[PI.mouth]); } return out; };
  const m = lips.map(mouth);
  const pearson = (x: number[], y: number[]) => { const mx = x.reduce((a, b) => a + b, 0) / x.length, my = y.reduce((a, b) => a + b, 0) / y.length; let a = 0, b = 0, c = 0; for (let i = 0; i < x.length; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return a / Math.sqrt(b * c); };
  const rs: number[] = []; for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) rs.push(pearson(m[i], m[j]));
  assert.ok(Math.max(...m[0]) - Math.min(...m[0]) > 0.04, 'the lips move');
  assert.ok(median(rs) < 0.5 && Math.max(...rs) < 0.95, `lips of two drinkers: median ${median(rs).toFixed(3)}, highest ${Math.max(...rs).toFixed(3)} (it was 1)`);
  const s = together({ clip: 'drink' }, sponge, 120, 10, 6);
  assert.ok(s.identical === 0 && s.r0 <= 0.6 && s.rBest <= 0.85, `leaf sponge: ${s.r0.toFixed(3)} at the same instant, ${s.rBest.toFixed(3)} at the best shift`);
});

test('what animals do together stays together', () => {
  // (A pant-hoot chorus was left on one cycle by this stage, every caller rising with both arms up within three
  // seconds of the others. Stage W13 redrew it: tests/render-call.test.ts holds that callers are a group of animals,
  // each its own, and that a call is one pant-hoot.)
  // An attacker's blow and its victim's flinch are on the pair's one beat: the flinch peaks at 0.66 of each half cycle.
  for (const id of ACTORS) {
    const blow = (t: number) => { w.bind(pose).reset(); CLIPS.attack(w, ctxOf(id, t, { clip: 'attack', pair: true })); return Math.max(pose.v[PI.ik + LIMB.armL * 5 + 1], pose.v[PI.ik + LIMB.armR * 5 + 1]); };
    const jolt = (t: number) => { w.bind(pose).reset(); CLIPS.defend(w, ctxOf(id + 1, t, { clip: 'defend', pair: true }, id)); return -pose.v[B.chest * 3]; };
    // One blow lasts half a cycle of the pair's beat: 0.5 / (2.8 x the pair's tempo) seconds.
    const half = 0.5 / (2.8 * ownTempo(ctxOf(id, 0, { clip: 'attack', pair: true }).pairSeed!, 21, 0.18));
    let peakB = -Infinity, peakJ = -Infinity, bt = 0, jt = 0;
    for (let t = 0; t < 2 * half; t += half / 400) { const b = blow(t), j = jolt(t); if (b > peakB + 1e-9) { peakB = b; bt = t; } if (j > peakJ + 1e-9) { peakJ = j; jt = t; } }
    const d = (((jt - bt) % half) + half) % half;
    assert.ok(d < 0.2 * half || d > 0.8 * half, `pair ${id}: within a blow of ${half.toFixed(3)} s the hand is highest and the victim flinches ${Math.min(d, half - d).toFixed(3)} s apart`);
  }
  // Two wrestlers are on their pair's clock: the pair's tempo is one number for both.
  for (const id of ACTORS) assert.equal(ctxOf(id, 3, { clip: 'wrestle', pair: true }).pairSeed, ctxOf(id + 1, 3, { clip: 'wrestle', pair: true }, id).pairSeed);
});

test('the same animal moves the same way on every run', () => {
  const variants: Variant[] = [...OUT_OF_STEP.map(x => x[1]), { clip: 'play' }, { clip: 'drink' }, { clip: 'forage', inTree: true }, { clip: 'pantHoot' }, { clip: 'sleep', inTree: true }, { clip: 'rest' }, { clip: 'sitIdle' }, { clip: 'stand' },
    { clip: 'groomee', role: GROOMEE.prone, pair: true }, { clip: 'carryDorsal' }, { clip: 'shelter' }, { clip: 'perch', role: PERCH.recline, inTree: true }, { clip: 'walk', gait: 1.1 }];
  for (const v of variants) for (const id of [3, 8, 21]) {
    const a = run(id, v, 240, 12);
    // (Another animal posed in between: nothing of one animal's pose may leak into the next.)
    run(id + 1, v, 5, 12);
    const b = run(id, v, 240, 12);
    assert.deepEqual(a, b, `${v.clip}, animal ${id}`);
    assert.ok(a.every(Number.isFinite), `${v.clip}: every channel is a number`);
  }
});

test('every animal has its own tempo, and its own start', () => {
  const seeds = SOLO.map(id => hash01(id, 17));
  for (const k of [0, 1, 2, 3, 4, 5, 6, 27, 40, 41, 42]) {
    const t = seeds.map(s => ownTempo(s, k, 0.3));
    assert.equal(new Set(t.map(x => x.toFixed(6))).size, t.length, `movement ${k}: no two of eight animals share a tempo`);
    assert.ok(t.every(x => x >= 0.7 && x <= 1.3) && Math.max(...t) - Math.min(...t) > 0.2, `movement ${k}: ${t.map(x => x.toFixed(2)).join(' ')}`);
  }
  for (const s of seeds) { assert.equal(ownTempo(s, 3), ownTempo(s, 3)); assert.ok(Math.abs(ownTempo(s, 3) - 1) <= 0.2); }
  // The clock an animal keeps is its tempo times the time, from its own start: continuous, never a jump.
  for (const s of seeds) { const d = ownClock(10.01, s, 7, 20, 0.2) - ownClock(10, s, 7, 20, 0.2); assert.ok(Math.abs(d - 0.01 * ownTempo(s, 7, 0.2)) < 1e-9); assert.ok(ownClock(0, s, 7, 20) >= 0 && ownClock(0, s, 7, 20) < 20); }
  assert.ok(new Set(seeds.map(s => ownClock(0, s, 7, 20).toFixed(3))).size === seeds.length);
  // An irregular beat: one movement per bar at most, its start drawn for each bar.
  const starts: number[] = []; let was = -1;
  for (let u = 0; u < 60; u += 0.01) { const p = barProgress(u, 3, 2, 0.37, 9); if (p >= 0 && was < 0) starts.push(u); was = p; }
  assert.ok(starts.length >= 18 && starts.length <= 20);
  const gaps = starts.slice(1).map((x, i) => x - starts[i]);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) > 0.5, `the gaps between movements differ (${gaps.map(g => g.toFixed(1)).join(' ')})`);
  assert.ok(FORAGE_BAR_S[0] > 2.75 && NEST_BAR_S[0] > 2.5, 'a bar is longer than the movement it holds');
});

test('nest builders: each keeps its own bar, pauses, looks round and changes arm at its own moments', () => {
  const seeds = SOLO.map(id => hash01(id, 17));
  const bars = seeds.map(nestBar);
  assert.ok(bars.every(p => p >= NEST_BAR_S[0] && p <= NEST_BAR_S[1]));
  assert.equal(new Set(bars.map(p => p.toFixed(4))).size, bars.length, 'no two builders have the same bar');
  // The sequence of arms over the first twelve reaches differs for every pair, and neither arm is all an animal uses.
  const arms = seeds.map(s => { const out: number[] = []; for (let n = 0; out.length < 12; n++) if (nestBeat(n, s) === NEST_BEAT.reach) out.push(nestArm(n, s)); return out.join(''); });
  assert.equal(new Set(arms).size, arms.length, `sequences of arms: ${arms.join(' ')}`);
  for (const a of arms) assert.ok(a.includes('0') && a.includes('1') && !/^(01)+$/.test(a) && !/^(10)+$/.test(a), `${a}: both arms, and not simply in turn`);
  // Shares of the three kinds of bar over many bars.
  let look = 0, press = 0, total = 0;
  for (const s of seeds) for (let n = 0; n < 400; n++) { total++; const k = nestBeat(n, s); if (k === NEST_BEAT.look) look++; else if (k === NEST_BEAT.press) press++; }
  assert.ok(Math.abs(look / total - NEST_LOOK_SHARE) < 0.03 && Math.abs(press / total - NEST_PRESS_SHARE) < 0.03, `${look} looks and ${press} presses in ${total} bars`);
  // Never more than two bars in a row without a reach (a builder was filmed pressing for five), and no pressing in
  // the first two bars of a build.
  for (let id = 1; id <= 200; id++) {
    const s = hash01(id, 17); let run = 0;
    for (let n = 0; n < 120; n++) { run = nestBeat(n, s) === NEST_BEAT.reach ? 0 : run + 1; assert.ok(run <= 2, `animal ${id}, bar ${n}: ${run} bars without a reach`); }
    assert.notEqual(nestBeat(0, s), NEST_BEAT.press); assert.notEqual(nestBeat(1, s), NEST_BEAT.press);
  }
  // The pose: a hand leaves the lap and comes back to it, and nothing jumps from one frame to the next, at a bar's end or anywhere.
  for (const id of SOLO) {
    const v: Variant = { clip: 'nestBuild', inTree: true }, fps = 60, frames = 60 * 40, N = POSE_SIZE + 2, x = run(id, v, frames, fps);
    let step = 0, lapL = 0, lapR = 0, high = 0, leaves = 0;
    for (let f = 1; f < frames; f++) {
      for (let l = 0; l < 2; l++) for (let k = 0; k < 3; k++) step = Math.max(step, Math.abs(x[f * N + PI.ik + l * 5 + k] - x[(f - 1) * N + PI.ik + l * 5 + k]));
      for (const b of [B.chest, B.head, B.spine]) for (let k = 0; k < 3; k++) step = Math.max(step, Math.abs(x[f * N + b * 3 + k] - x[(f - 1) * N + b * 3 + k]));
      const yl = x[f * N + PI.ik + 1], yr = x[f * N + PI.ik + 5 + 1];
      if (Math.abs(yl - 0.25) < 1e-6) lapL++; if (Math.abs(yr - 0.25) < 1e-6) lapR++;
      if (Math.max(yl, yr) > 0.6) high++;
      if (x[f * N + POSE_SIZE] !== 0 || x[f * N + POSE_SIZE + 1] !== 0) leaves++;
    }
    assert.ok(step < 0.035, `animal ${id}: the largest change in one frame is ${step.toFixed(4)}`);
    assert.ok(lapL > frames * 0.3 && lapR > frames * 0.3, `animal ${id}: each hand is in the lap much of the time (${lapL}, ${lapR} of ${frames})`);
    assert.ok(high > frames * 0.05 && leaves > frames * 0.1, `animal ${id}: it reaches up for branches and brings them in (${high}, ${leaves})`);
    assert.equal(x[PI.ground], 0, 'seated in the crown');
  }
});

test('nest builders: each turns at its own moments, by its own amounts', () => {
  // Without an id the turns are stage W9's: four of 1.9 rad at fifths of the build (the harness reads them so).
  assert.equal(nestTurn(0.21), NEST_TURN_RAD); assert.equal(nestTurn(0.99), 4 * NEST_TURN_RAD); assert.equal(nestTurn(1), 0);
  const ids = SOLO, at = ids.map(id => Array.from({ length: NEST_TURNS - 1 }, (_, i) => nestTurnAt(id, i + 1)));
  for (let a = 0; a < ids.length; a++) {
    const id = ids[a];
    // (The plan reads 0 again when the nest is done. Since stage W13 the layer draws the turns through perch.ts nestTurnStep,
    // which keeps what was turned: the animal lies down facing as it last sat. tests/render-call.test.ts.)
    assert.equal(nestTurn(0, id), 0); assert.equal(nestTurn(1, id), 0); assert.equal(nestTurn(-0.2, id), 0);
    // In order, each within NEST_TURN_SHIFT of a fifth of its nominal moment, and the heading changes exactly there.
    for (let i = 0; i < NEST_TURNS - 1; i++) { assert.ok(Math.abs(at[a][i] * NEST_TURNS - (i + 1)) <= NEST_TURN_SHIFT + 1e-9); if (i) assert.ok(at[a][i] > at[a][i - 1]); assert.notEqual(nestTurn(at[a][i] - 1e-6, id), nestTurn(at[a][i] + 1e-6, id)); }
    const seen: number[] = [0]; for (let k = 0; k < 1; k += 0.0005) { const t = nestTurn(k, id); if (seen[seen.length - 1] !== t) seen.push(t); }
    assert.equal(seen.length, NEST_TURNS, `animal ${id} faces ${NEST_TURNS} ways in turn`);
    for (let i = 1; i < seen.length; i++) { const d = Math.abs(seen[i] - seen[i - 1]); assert.ok(d >= 0.6 * 0.7 * NEST_TURN_RAD - 1e-9 && d <= 1.3 * NEST_TURN_RAD + 1e-9, `a turn of ${d.toFixed(2)} rad`); }
  }
  // Builders that begin together. Before, every pair made all four turns in the same frame, by the same angle, the
  // same way round. Now a turn of one falls within 2% of the build (five seconds) of a turn of the other only by
  // chance: each turn's moment is spread over 18% of the build, so about one turn in five does (0.9 of the four per
  // pair), and a pair that shares two is not rare. No pair shares all four, most share one or none, and where two
  // builders do turn at one moment they turn by their own amounts.
  const shared: number[] = [];
  for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
    let near = 0; for (const x of at[a]) if (at[b].some(y => Math.abs(x - y) < 0.02)) near++;
    shared.push(near);
    assert.ok(near < NEST_TURNS - 1, `animals ${ids[a]} and ${ids[b]} do not make all their turns together (${near})`);
    let same = 0, n = 0; for (let k = 0.05; k < 1; k += 0.01) { n++; if (Math.abs(nestTurn(k, ids[a]) - nestTurn(k, ids[b])) < 0.05) same++; }
    assert.ok(same < n * 0.5, `animals ${ids[a]} and ${ids[b]} face the same way for ${same} of ${n} moments of the build`);
  }
  assert.ok(median(shared) <= 1, `turns shared by a pair: ${shared.join(' ')}`);
  assert.ok(shared.filter(x => x >= 2).length <= shared.length * 0.4, `pairs that share two turns or more: ${shared.filter(x => x >= 2).length} of ${shared.length}`);
  assert.ok(new Set(ids.map(id => Math.sign(nestTurn(nestTurnAt(id, 1) + 1e-6, id)))).size === 2, 'some go round one way, some the other');
});

test('building or asleep is the simulation\'s word: a finished nest has a sleeper in it', () => {
  const H = 1 / 3600;
  // A nest that was there when the body was first drawn in the act: asleep at once, whatever the act's clock says.
  assert.equal(nestProgress(-Infinity, 0, 0, 0, 0), 1);
  assert.equal(nestProgress(-Infinity, 12.5, 30, 0, 0), 1);
  // No finished nest yet: the building follows its clock, then waits at the last touches for as long as the simulation takes.
  assert.equal(nestProgress(Infinity, 10, 0, 0, 0), 0);
  assert.ok(Math.abs(nestProgress(Infinity, 10, 120, 0, 0) - 120 / NEST_BUILD_S) < 1e-12);
  assert.equal(nestProgress(Infinity, 10, 239, 0, 0), NEST_HOLD_K); assert.equal(nestProgress(Infinity, 10, 5000, 0, 0), NEST_HOLD_K);
  assert.ok(NEST_HOLD_K < 1, 'never finished before the simulation says so');
  // The simulation finishes the nest at 10 h; the body is two ticks behind, at 0.6 of the way: the rest is drawn over
  // those 30 s, without a step, and it lies down when its own time gets there.
  const done = 10, t0 = done - 30 * H;
  assert.ok(Math.abs(nestProgress(done, t0, 150, t0, 0.6) - 0.6) < 1e-9, 'no step when the finished nest is first seen');
  let last = 0.6; for (let s = 0; s < 30; s += 0.5) { const k = nestProgress(done, t0 + s * H, 150 + s, t0, 0.6); assert.ok(k >= last - 1e-12 && k < 1 && k - last < 0.01); last = k; }
  assert.ok(last > 0.99);
  assert.equal(nestProgress(done, done, 180, t0, 0.6), 1); assert.equal(nestProgress(done, done + 1, 9999, t0, 0.6), 1);
  // Seen finished with the body already past it (states were skipped): asleep at once.
  assert.equal(nestProgress(done, done + 0.2, 20, done + 0.2, 0.1), 1);

  // A world as it opens (the field map the app opens, and the 160 m map): every animal is in the nest act in a
  // finished nest with the act's clock at 0. The old test, "fewer than 240 s in the act", read that as building.
  for (const profile of ['field', 'compressed'] as const) {
    const world = createWorld(48, { profile });
    assert.ok(world.chimps.length > 20);
    for (const c of world.chimps) {
      assert.equal(c.action, 'nest'); assert.ok(c.nest !== null, 'the simulation says the nest is finished'); assert.equal(c.actionTime, 0);
      const doneAt = c.action === 'nest' && c.nest !== null ? -Infinity : Infinity;   // creatures.ts chooseClip, the first frame of the act
      assert.equal(nestProgress(doneAt, world.time, c.actionTime, 0, 0), 1, `${profile}: animal ${c.id} is drawn asleep, not building`);
    }
  }
  // And the sleep clip is a body lying with its eyes shut, off the ground (in its nest).
  for (const id of SOLO) { w.bind(pose).reset(); CLIPS.sleep(w, ctxOf(id, 5, { clip: 'sleep', inTree: true })); assert.equal(postureOf(pose.v), Posture.lying); assert.equal(pose.v[PI.eyes], 1); assert.equal(pose.v[PI.ground], 0); }
});

test('the building of one nest act never goes back (second reading)', () => {
  const H = 1 / 3600;
  // The renderer counts the seconds of a building on one of two clocks and may change between them (the frame a
  // time-lapse stops: filmed with a builder at 0.50 reading 0.08 in the next frame). With what has been drawn as the
  // floor, the progress waits where it was until its clock has caught up.
  assert.ok(Math.abs(nestProgress(Infinity, 10, 20, 0, 0) - 20 / NEST_BUILD_S) < 1e-12, 'without a floor the restarted clock reads a twelfth');
  assert.equal(nestProgress(Infinity, 10, 20, 0, 0, 0.5), 0.5, 'held at what was drawn');
  let top = 0.5, last = 0.5;
  for (let s = 20; s < 300; s += 0.25) { const k = nestProgress(Infinity, 10 + s * H, s, 0, 0, top); assert.ok(k >= last && k <= NEST_HOLD_K, `no step back at ${s} s`); assert.ok(k - last < 0.002, 'and no jump when the clock catches up'); top = last = k; }
  assert.equal(last, NEST_HOLD_K);
  // The floor alone never finishes a nest: only the simulation's finished nest does. And a floor of 0 changes nothing.
  assert.equal(nestProgress(Infinity, 10, 5, 0, 0, 1), 5 / NEST_BUILD_S);
  for (const built of [0, 30, 120, 239, 400]) assert.equal(nestProgress(Infinity, 10, built, 0, 0, 0), nestProgress(Infinity, 10, built, 0, 0));
  // Once the simulation has finished the nest, the rest is drawn from where the building stood: the floor is under it.
  const done = 10, t0 = done - 30 * H; last = 0.5;
  for (let s = 0; s < 30; s += 0.5) { const k = nestProgress(done, t0 + s * H, 20 + s, t0, 0.5, last); assert.ok(k >= last && k < 1); last = k; }
  assert.equal(nestProgress(done, done, 50, t0, 0.5, last), 1);
  // A nest that was there when the body was first drawn in the act: asleep, whatever the floor.
  assert.equal(nestProgress(-Infinity, 0, 0, 0, 0, 0.3), 1);
});

test('animals released together do not start an idle event together', () => {
  const ALL = idleBit(IDLE.scratch) | idleBit(IDLE.yawn) | idleBit(IDLE.shift) | idleBit(IDLE.glance) | idleBit(IDLE.nod), ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  /** Seconds from the release to each animal's first event: held for `busy` s (after `before` s of idling), then free. */
  const firsts = (busy: number, before: number) => ids.map(id => {
    const s = createIdle(id), dt = 1 / 60; let t = 0;
    for (; t < before; t += dt) idleStep(s, id, dt, 1, ALL);
    const t0 = t; for (; t < t0 + busy; t += dt) idleStep(s, id, dt, 1, 0);
    const t1 = t; for (; t < t1 + 60; t += dt) if (idleStep(s, id, dt, 1, ALL)) return t - t1;
    return NaN;
  });
  // Before: held for 45 s, all twelve started at 3.00 s; held for 2.4 s after 20 s of idling, seven of twelve did.
  // Now each waits its own time, 3 to 12 s. Twelve independent starts spread over nine seconds still fall within a
  // quarter second of another about half the time by chance, so what is held is the size of the largest group that
  // starts together: three at most (it was twelve), and no more than chance in pairs.
  for (const [busy, before] of [[45, 0], [2.4, 20], [600, 0]]) {
    const f = firsts(busy, before);
    assert.ok(f.every(x => x >= IDLE_SETTLE - 0.05), `nothing starts in the first ${IDLE_SETTLE} s (${f.map(x => x.toFixed(1)).join(' ')})`);
    let group = 0, meet = 0;
    for (let i = 0; i < f.length; i++) { const n = f.filter(x => x >= f[i] && x < f[i] + 0.25).length; if (n > group) group = n; if (f.some((x, j) => j !== i && Math.abs(x - f[i]) < 0.25)) meet++; }
    assert.ok(group <= 3, `held ${busy} s: ${group} animals start within one quarter second (${f.map(x => x.toFixed(2)).join(' ')}); it was all twelve at 3.00 s`);
    assert.ok(meet <= 9, `held ${busy} s: ${meet} of ${f.length} start within 0.25 s of another`);
    assert.ok(Math.max(...f) - Math.min(...f) > 4, 'the first events are spread over seconds');
  }
  for (const id of ids) for (const n of [0, 1, 7]) { const x = idleSettle(id, n); assert.ok(x >= IDLE_SETTLE && x <= IDLE_SETTLE + IDLE_SETTLE_SPREAD); assert.equal(x, idleSettle(id, n)); }
});

test('nothing in the creature renderer draws from Math.random for these movements', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['poses.ts', 'perch.ts', 'secondary.ts', 'idle.ts', 'nests.ts']) assert.ok(!/Math\.random/.test(readFileSync(new URL(`../src/render/creatures/${f}`, import.meta.url), 'utf8')), `${f} has no Math.random`);
  assert.ok(!/Math\.random/.test(readFileSync(new URL('../src/render/creatures.ts', import.meta.url), 'utf8')), 'creatures.ts has no Math.random');
});

// Stage W14, second reader: a party sitting out a storm. The shelter clip was one pose for every animal (a 0.006 rad
// shiver aside), and two animals that began to shelter in the same frame were drawn the same to the millimetre for the
// 45 s filmed (films ST1, ST2). Each now holds its own hunch.
test('animals sheltering together each hold their own hunch', () => {
  const at = (id: number) => { w.bind(pose).reset(); CLIPS.shelter(w, ctxOf(id, 5, { clip: 'shelter' })); return Float32Array.from(pose.v); };
  const poses = SOLO.map(at);
  let least = Infinity;
  for (let i = 0; i < poses.length; i++) for (let j = i + 1; j < poses.length; j++) {
    let d = 0; for (let ch = 0; ch < POSE_SIZE; ch++) d = Math.max(d, Math.abs(poses[i][ch] - poses[j][ch]));
    least = Math.min(least, d);
  }
  assert.ok(least > 0.03, `the closest two of eight sheltering animals differ by ${least.toFixed(3)} in some joint (before: under 0.001)`);
});
