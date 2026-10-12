import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import type { BodyPercept, Chimp } from '../src/types';
import {
  FILL_NEUTRAL, GESTATION_DAYS, GUT_FLANK, LID_FROM, LID_FULL, LID_MAX, MOOD_AGGRESSIVE, POST_CONFLICT_H, PREGNANT, STRESS_COAT, STRESS_FROM, TONIC_COAT,
  RIDER_COAT, arousalOf, bellyOf, bellyUnder, bodyChannels, coatUnder, coatValue, createChannels, flankOf, gutOf, lidOf, scratchOf, yawnOf,
} from '../src/render/creatures/bodystate';
import { BODY_STATE, createChimpMaterials, createSilhouetteMaterial } from '../src/render/creatures/material';
import { PARAM_TEXEL, ROW_TEXELS } from '../src/render/creatures/rig';
import { bodyStateOf, createWorld, tickWorld } from '../src/simulation';
import { worldHash } from './fixtures/golden';

// Stage W8 (docs/staging/w8b-state-on-body.md): the state that drives decisions, read as channels the body can show
// (src/render/creatures/bodystate.ts). Every mapping is a stylization: the tests pin that each is monotonic and
// bounded, what the public stand-ins are, and that reading the state writes nothing. They do not say how a
// chimpanzee looks.

const grid = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);
const rising = (xs: number[], f: (x: number) => number, what: string) => { let prev = -Infinity; for (const x of xs) { const y = f(x); assert.ok(Number.isFinite(y), `${what} at ${x}`); assert.ok(y >= prev - 1e-12, `${what} falls at ${x}: ${prev} then ${y}`); prev = y; } };

test('belly: never falls as the gut fills or a pregnancy advances; as built at the neutral fill; bounded', () => {
  rising(grid(200), f => bellyOf(f, 0), 'belly by fill');
  for (const fill of [0, 0.3, FILL_NEUTRAL, 1]) rising(grid(240).map(x => x * 260), d => bellyOf(fill, d), `belly by pregnancy days at fill ${fill}`);
  assert.equal(bellyOf(FILL_NEUTRAL, 0), 0, 'an ordinary animal is drawn as the mesh is built');
  assert.equal(bellyOf(0, 0), -1); assert.equal(bellyOf(1, 0), 1);
  assert.ok(Math.abs(bellyOf(FILL_NEUTRAL, GESTATION_DAYS) - PREGNANT) < 1e-9, 'a pregnancy at term adds PREGNANT');
  assert.equal(bellyOf(FILL_NEUTRAL, 0.2 * GESTATION_DAYS), 0, 'an early pregnancy does not show');
  for (const f of [-3, 0, 0.5, 1, 9]) for (const d of [-5, 0, 100, 227, 5000]) { const b = bellyOf(f, d); assert.ok(b >= -1 && b <= 1 + PREGNANT, `belly ${b} out of range`); }
  rising(grid(100), gutOf, 'the gut part');
});

test('flanks: from published reserves, else from poor health, and they follow the gut by GUT_FLANK; monotonic and bounded', () => {
  rising(grid(100).map(x => x * 3 - 1.5), r => flankOf(r, 1), 'flank by reserves');
  rising(grid(100), h => flankOf(undefined, h), 'flank by health');
  rising(grid(100), f => flankOf(0, 1, f), 'flank by gut fill');
  assert.equal(flankOf(undefined, 1), 0); assert.equal(flankOf(undefined, 0.95), 0, 'sound health: as built');
  assert.ok(flankOf(undefined, 0.6) < -0.5, 'poor health hollows the flanks');
  assert.equal(flankOf(-0.4, 1), -0.4, 'published reserves are used as they are');
  assert.ok(Math.abs(flankOf(0, 1, 0) + GUT_FLANK) < 1e-12 && Math.abs(flankOf(0, 1, 1) - GUT_FLANK) < 1e-12, 'an empty gut tucks them, a full one rounds them');
  for (const r of [undefined, -9, 0, 9]) for (const h of [0, 0.5, 1]) for (const f of [0, 0.7, 1]) { const v = flankOf(r, h, f); assert.ok(v >= -1 && v <= 1); }
});

test('eyelid and yawns: nothing below the threshold, then rising with felt sleepiness, bounded', () => {
  rising(grid(200), lidOf, 'lid'); rising(grid(200), yawnOf, 'yawn rate');
  assert.equal(lidOf(0), 0); assert.equal(lidOf(LID_FROM), 0, 'no droop by day');
  assert.ok(Math.abs(lidOf(LID_FULL) - LID_MAX) < 1e-12 && Math.abs(lidOf(1) - LID_MAX) < 1e-12, 'never more than LID_MAX while awake');
  assert.ok(LID_MAX < 0.7, 'an awake animal keeps its eye more than a third open');
  assert.equal(yawnOf(0), 1); assert.ok(yawnOf(1) > 5, 'a sleepy animal yawns several times as often');
});

test('arousal: rises with stress, with the fast and the slow state, takes a floor from the mood, stays in 0..1', () => {
  rising(grid(100), s => arousalOf(s, 'calm', undefined, undefined), 'arousal by stress');
  rising(grid(100), f => arousalOf(0, 'calm', 0.3, f), 'arousal by the fast state');
  rising(grid(100), s => arousalOf(0, 'calm', s, 0.4), 'arousal by the slow state');
  assert.equal(arousalOf(STRESS_FROM, 'calm', undefined, undefined), 0, 'ordinary stress raises nothing');
  assert.ok(Math.abs(arousalOf(1, 'calm', undefined, undefined) - STRESS_COAT) < 1e-12);
  assert.equal(arousalOf(0, 'aggressive', undefined, undefined), MOOD_AGGRESSIVE);
  assert.ok(Math.abs(arousalOf(0.9, 'calm', 1, 0) - TONIC_COAT) < 1e-12, 'with the states published, stress is not read and the slow state alone lifts the coat a little');
  assert.equal(arousalOf(0, 'calm', 1, 1), 1);
  for (const s of [-1, 0, 2]) for (const sl of [undefined, -1, 0.5, 3]) for (const f of [undefined, -1, 0.5, 3]) for (const m of ['calm', 'aggressive', 'excited', 'fearful'] as const) { const a = arousalOf(s, m, sl, f); assert.ok(a >= 0 && a <= 1); }
});

test('scratching: more with arousal, and raised for the ten minutes after a lost conflict and not after', () => {
  rising(grid(100), a => scratchOf(a, -1), 'scratch rate by arousal');
  assert.equal(scratchOf(0, -1), 1, 'the baseline');
  const after = scratchOf(0, 0), late = scratchOf(0, POST_CONFLICT_H - 1e-6), over = scratchOf(0, POST_CONFLICT_H + 1e-6);
  assert.ok(after > 3 && late === after, 'raised through the whole window (fraser2008: the entire ten minutes)');
  assert.equal(over, 1, 'and back at the baseline after it');
  assert.equal(POST_CONFLICT_H, 10 / 60);
});

test('the coat value: the clip\'s own value when calm, the larger of clip and arousal, pulled sleek by fear; within −1..1', () => {
  for (const b of grid(10)) assert.equal(coatValue(b, 0, 0), b, 'arousal and fear at 0: as before the stage');
  rising(grid(50), a => coatValue(0.2, a, 0), 'coat by arousal');
  rising(grid(50), b => coatValue(b, 0.3, 0.2), 'coat by the clip');
  let prev = Infinity; for (const f of grid(50)) { const v = coatValue(0.8, 0.5, f); assert.ok(v <= prev + 1e-12, 'fear only ever lowers it'); prev = v; }
  assert.equal(coatValue(1, 1, 1), -1, 'afraid: sleek whatever the clip holds');
  assert.equal(coatValue(1, 0, 0), 1, 'a display holds 1');
  for (const b of [-2, 0, 0.5, 3]) for (const a of [-2, 0, 0.5, 3]) for (const f of [-2, 0, 0.5, 3]) { const v = coatValue(b, a, f); assert.ok(v >= -1 && v <= 1); }
});

test('a carrier gives way to what it carries: no rounded belly under an infant on it, no tall coat under a rider', () => {
  // (Review: the infant is placed on the skeleton, so a full belly grew into the infant clinging to it.)
  for (const b of [-1, -0.4, 0]) { assert.equal(bellyUnder(b, true), b, 'a tucked belly stays as it is'); assert.equal(bellyUnder(b, false), b); }
  for (const b of [0.2, 0.93, 1 + PREGNANT]) { assert.equal(bellyUnder(b, true), 0, 'no rounder than built under an infant'); assert.equal(bellyUnder(b, false), b, 'and untouched without one'); }
  rising(grid(100).map(x => x * 3 - 1), b => bellyUnder(b, true), 'belly under an infant');
  for (const c of [-1, 0, 0.2, RIDER_COAT]) { assert.equal(coatUnder(c, true), c); assert.equal(coatUnder(c, false), c); }
  for (const c of [0.5, 1]) { assert.equal(coatUnder(c, true), RIDER_COAT); assert.equal(coatUnder(c, false), c); }
  assert.ok(RIDER_COAT > 0 && RIDER_COAT * BODY_STATE.COAT_RAISE <= 0.02, 'a rider sinks no more than two centimetres into the coat');
});

const animal = (o: Partial<Chimp> = {}): Chimp => ({ hunger: 0.3, energy: 1, stress: 0.05, health: 1, pregnancy: 0, mood: 'calm', action: 'rest', lastConflict: null, ...o } as Chimp);

test('one animal: the public stand-ins, and the Track E record in their place when the simulation gives one', () => {
  const ch = createChannels();
  // Public fields only (the default world): the belly from 1 − hunger, the lid from 1 − energy, the coat from stress and mood.
  bodyChannels(animal(), null, 10, ch);
  assert.ok(Math.abs(ch.belly) < 1e-9 && ch.flank === 0 && ch.lid === 0 && ch.arousal === 0 && ch.fear === 0 && ch.scratch === 1 && ch.yawn === 1, 'an ordinary animal: everything as built');
  assert.ok(bodyChannels(animal({ hunger: 0.05 }), null, 10, ch).belly > 0.8, 'fed');
  assert.ok(bodyChannels(animal({ hunger: 0.9 }), null, 10, ch).belly < -0.8 && ch.flank < -0.4, 'hungry: tucked');
  assert.ok(bodyChannels(animal({ energy: 0.1 }), null, 10, ch).lid > 0.4 && ch.yawn > 5, 'exhausted');
  assert.equal(bodyChannels(animal({ mood: 'fearful', action: 'flee' }), null, 10, ch).fear, 1);
  assert.equal(bodyChannels(animal({ mood: 'fearful', action: 'alarm' }), null, 10, ch).fear, 0, 'an alarm at a predator keeps its hair on end');
  // A lost conflict five minutes ago raises the scratch rate; a won one, or one an hour ago, does not.
  assert.ok(bodyChannels(animal({ lastConflict: { opponentId: 2, time: 10 - 5 / 60, won: false } }), null, 10, ch).scratch > 3);
  assert.equal(bodyChannels(animal({ lastConflict: { opponentId: 2, time: 10 - 5 / 60, won: true } }), null, 10, ch).scratch, 1);
  assert.equal(bodyChannels(animal({ lastConflict: { opponentId: 2, time: 9, won: false } }), null, 10, ch).scratch, 1);
  // The Track E record wins over the stand-ins, field by field.
  const body: BodyPercept = { gutFill: 0.1, reserves: -0.5, sleepiness: 0.9, arousal: 0.6, acute: 0.5 };
  bodyChannels(animal({ hunger: 0.05, energy: 1, stress: 0.9 }), body, 10, ch);
  assert.ok(ch.belly < -0.8, 'gut fill, not hunger');
  assert.ok(ch.flank < -0.9, 'reserves and the empty gut');
  assert.ok(ch.lid > 0.5 * LID_MAX, 'felt sleepiness, not energy');
  assert.ok(Math.abs(ch.arousal - 0.5 * 1.3) < 1e-9, 'the fast state amplified by the slow one, not stress');
});

test('the reader: null on the default parameters, the Track E record when its mechanisms run, and it writes nothing', () => {
  const plain = createWorld(48);
  for (let i = 0; i < 40; i++) tickWorld(plain);
  assert.equal(bodyStateOf(plain, plain.chimps[0]), null, 'no Track E mechanism: the public fields are all there is');
  const w = createWorld(48, { params: { energyLedger: 1, rhythmSleep: 1, endoStates: 1 } });
  for (let i = 0; i < 40; i++) tickWorld(w);
  const before = worldHash(w), json = JSON.stringify(w);
  let seen = 0;
  for (const c of w.chimps) {
    const b = bodyStateOf(w, c);
    if (!c.alive) { assert.equal(b, null); continue; }
    assert.ok(b, 'a living animal has a record');
    for (const v of Object.values(b)) assert.ok(typeof v === 'boolean' || Number.isFinite(v));
    if (b.gutFill !== undefined) { assert.ok(b.gutFill >= 0 && b.gutFill <= 1); seen++; }
    if (b.sleepiness !== undefined) assert.ok(b.sleepiness >= 0 && b.sleepiness <= 1);
  }
  assert.ok(seen > 10, 'gut fill is given once the ledger has run');
  assert.equal(worldHash(w), before, 'reading it changes no hash');
  assert.equal(JSON.stringify(w), json, 'and writes nothing to the World');
});

test('the shader: the coat, belly, flanks and breath are in the vertex code every pass shares, and no texel was added', () => {
  assert.equal(ROW_TEXELS, 132, 'the row is as long as it was');
  assert.ok(PARAM_TEXEL + 6 < ROW_TEXELS, 'the new parameter texel lies inside it');
  assert.ok(BODY_STATE.COAT_RAISE >= 0.03 && BODY_STATE.COAT_RAISE <= 0.08, 'several centimetres (it was 0.006 to 0.024)');
  const mats = createChimpMaterials(1);
  const patched = (mat: THREE.Material, lib: { vertexShader: string; fragmentShader: string }) => {
    const shader = { uniforms: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
    (mat.onBeforeCompile as unknown as (s: typeof shader, r: null) => void)(shader, null);
    return shader;
  };
  const xray = createSilhouetteMaterial(mats.texture, false, { uOpacity: { value: 1 }, uViewport: { value: new THREE.Vector2() }, uBias: { value: 0 }, uLine: { value: new THREE.Color() }, uFillK: { value: 1 } });
  const terms = [`texelFetch(uBones, ivec2(${PARAM_TEXEL + 6}, cSlot), 0)`, 'float cCoatM = cFurM * max(', `* ${BODY_STATE.COAT_RAISE.toFixed(5)};`, 'float cBody = cBellyM * (', 'normal * (cCoat + cBody + '];
  for (const [name, vs] of [['body', patched(mats.material, THREE.ShaderLib.standard).vertexShader], ['shell', patched(mats.shell, THREE.ShaderLib.standard).vertexShader],
    ['shadow', patched(mats.depth, THREE.ShaderLib.depth).vertexShader], ['x-ray', patched(xray, THREE.ShaderLib.basic).vertexShader]] as const)
    for (const term of terms) assert.ok(vs.includes(term), `${name} pass: vertex code lacks ${term}`);
  // The coat takes nothing on bare skin (the fur mask) and the lid is read from the free float of P5.
  const fs = patched(mats.material, THREE.ShaderLib.standard).fragmentShader;
  for (const marker of ['float cLid = vP5.z > 0.004', 'float cUp = clamp(vCoat, 0.0, 1.0), cSleek = clamp(-vCoat, 0.0, 1.0);']) assert.ok(fs.includes(marker), `fragment patch missing: ${marker}`);
});
