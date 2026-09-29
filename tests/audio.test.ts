import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CALL_KINDS, INTERACTION_VOICES, KIND, MAX_VOICES, REF_DISTANCE, absorptionCutoff, admitAtRate, ambienceWidth, animalZoomGain, bedLevels, birdChorus,
  burbleGain, cooldownOk, distanceGain, emptyLevels, headingOf, nearestOnStream, pickSlot, poolFor, rateTier, streamGain, streamPan, thunderShape,
  voicePriority, voiceRate, zoomFromFrameHeight, type BedInput, type ClipMeta,
} from '../src/audio/mix';
import { synthDrum, synthLaugh } from '../src/audio/synth';
import { DEFAULT_SOUND, SOUND_KEY, loadSound, sanitizeSound, saveSound } from '../src/audio/settings';
import type { CallKind, Stream } from '../src/types';

const input = (o: Partial<BedInput> = {}): BedInput => ({ hour: 12, daylight: 1, weather: 'clear', rain: 0, zoom01: 0, streamDistance: Infinity, hoursPerSecond: 0.02, ...o });
const levels = (o: Partial<BedInput> = {}) => bedLevels(input(o), emptyLevels());

// --- Beds -------------------------------------------------------------------

test('bird chorus peaks at dawn, is lower by day, softer at dusk and silent at night', () => {
  assert.equal(birdChorus(6.5), 1);
  assert.equal(birdChorus(5.8), 1);
  assert.equal(birdChorus(7.4), 1);
  assert.ok(Math.abs(birdChorus(12) - 0.3) < 1e-9);
  assert.ok(birdChorus(18.3) > birdChorus(12) && birdChorus(18.3) < birdChorus(6.5));
  for (const h of [0, 2, 4.9, 20, 23.5]) assert.equal(birdChorus(h), 0, `hour ${h}`);
  // Continuous: no jumps anywhere in the day.
  for (let h = 0; h < 24; h += 0.01) assert.ok(Math.abs(birdChorus(h + 0.01) - birdChorus(h)) < 0.05, `jump at ${h.toFixed(2)}`);
});

test('night insects follow daylight and dawn birds follow the clock', () => {
  assert.equal(levels({ hour: 23, daylight: 0 }).night, 1);
  assert.equal(levels({ hour: 12, daylight: 1 }).night, 0);
  const dawn = levels({ hour: 6.5, daylight: 0.2 });
  assert.ok(dawn.dawn > 0.9 && dawn.night > 0 && dawn.night < 1, 'dawn overlaps birds and fading insects');
  assert.equal(levels({ hour: 2, daylight: 0 }).dawn, 0);
});

test('rain and storm beds follow weather; rain quiets birds and insects', () => {
  const dry = levels({ rain: 0 }), drizzle = levels({ weather: 'rain', rain: 0.15 }), heavy = levels({ weather: 'rain', rain: 0.4 });
  assert.equal(dry.rain, 0);
  assert.ok(drizzle.rain > 0.3 && drizzle.rain < heavy.rain);
  assert.equal(heavy.storm, 0, 'no storm bed in plain rain');
  const storm = levels({ weather: 'storm', rain: 0.85 });
  assert.equal(storm.rain, 1);
  assert.equal(storm.storm, 1);
  assert.ok(levels({ hour: 6.5, rain: 0.8 }).dawn < 0.3, 'birds fall silent in heavy rain');
  assert.ok(levels({ hour: 23, daylight: 0, rain: 0.8 }).night < 0.5);
});

test('fast playback eases beds to a steady daytime mix (no day/night strobing)', () => {
  const night = levels({ hour: 23, daylight: 0, hoursPerSecond: 24 });
  assert.equal(night.night, 0);
  assert.ok(Math.abs(night.dawn - birdChorus(10)) < 1e-9);
  const slow = levels({ hour: 23, daylight: 0, hoursPerSecond: 1 / 60 });
  assert.equal(slow.night, 1);
});

test('stream is clear near the water, quiet away from it, and wider but softer zoomed out', () => {
  assert.ok(streamGain(0, 0) > 0.99);
  assert.ok(streamGain(10, 0) < 0.25);
  assert.ok(streamGain(40, 0) < 0.02);
  for (let d = 0; d < 80; d += 2) assert.ok(streamGain(d + 2, 0.5) <= streamGain(d, 0.5), 'monotonic in distance');
  assert.ok(streamGain(40, 1) > streamGain(40, 0), 'zoomed out hears the stream from farther');
  assert.ok(streamGain(0, 1) < streamGain(0, 0), 'but never as loud as standing at the bank');
  assert.equal(burbleGain(0, 1), 0, 'near-field burble only in close views');
  assert.ok(burbleGain(0, 0) > 0.99 && burbleGain(8, 0) < 0.1);
  assert.equal(levels({ streamDistance: Infinity }).stream, 0, 'no stream, no bed');
  assert.ok(Math.abs(streamPan(Math.PI / 2, 20)) > 0.7 && Math.abs(streamPan(Math.PI / 2, 0)) < 1e-9, 'pan collapses at the bank');
});

test('nearest stream point measures from the bank', () => {
  const stream: Stream = { points: [[-50, 0, 0], [0, 0, 0], [50, 0, 10]], halfWidth: 1.8, crossings: [] };
  const out = { x: 0, z: 0, d: 0 };
  assert.ok(nearestOnStream(stream, -20, 10, out));
  assert.ok(Math.abs(out.d - (10 - 1.8)) < 1e-9 && out.x === -20 && out.z === 0);
  nearestOnStream(stream, 0, 0.5, out);
  assert.equal(out.d, 0, 'inside the channel');
  assert.equal(nearestOnStream(undefined, 0, 0, out), false);
  assert.equal(out.d, Infinity);
});

// --- Zoom and distance --------------------------------------------------------

test('animal bus is full in close/cinematic views and fades to silence zoomed out', () => {
  assert.equal(animalZoomGain('close', 0.7), 1);
  assert.equal(animalZoomGain('cinematic', 1), 1);
  assert.equal(animalZoomGain('rts', 0.2), 1);
  assert.equal(animalZoomGain('rts', 1), 0);
  assert.ok(animalZoomGain('rts', 0.65) > 0.2 && animalZoomGain('rts', 0.65) < 0.8);
  for (let z = 0; z < 1; z += 0.05) assert.ok(animalZoomGain('rts', z + 0.05) <= animalZoomGain('rts', z));
  assert.ok(ambienceWidth(1) > ambienceWidth(0));
});

test('zoom01 maps frame height: close view ≈ 0, default overview ≈ 0.9+, whole map = 1', () => {
  assert.equal(zoomFromFrameHeight(5), 0);
  assert.ok(zoomFromFrameHeight(10) < 0.12, 'close view at ~13 m orbit');
  assert.ok(zoomFromFrameHeight(98) > 0.9, 'default overview');
  assert.equal(zoomFromFrameHeight(200), 1);
  assert.equal(animalZoomGain('rts', zoomFromFrameHeight(98)), 0, 'default overview is ambience only');
  assert.equal(animalZoomGain('rts', zoomFromFrameHeight(17)), 1, 'fully zoomed-in overview hears animals');
});

test('distance gain: full inside 5 m, falls with distance, silent past each kind’s range', () => {
  for (const k of CALL_KINDS) {
    assert.equal(distanceGain(REF_DISTANCE * 0.5, k), 1);
    assert.equal(distanceGain(KIND[k].range + 1, k), 0);
    for (let d = 1; d < KIND[k].range; d += 1) assert.ok(distanceGain(d + 1, k) <= distanceGain(d, k) + 1e-12, `${k} monotonic`);
  }
  assert.ok(distanceGain(90, 'pant-hoot') > 0, 'pant-hoots carry farthest');
  assert.equal(distanceGain(20, 'pant-grunt'), 0, 'pant-grunts are close-range');
  assert.ok(KIND.drum.range >= KIND['pant-hoot'].range && KIND['pant-hoot'].range > KIND.scream.range && KIND.scream.range > KIND['pant-grunt'].range);
  assert.ok(absorptionCutoff(100) < absorptionCutoff(10) && absorptionCutoff(0) === 16000);
});

// --- Voices -------------------------------------------------------------------

test('priority: closer, louder, more severe and the selected chimp win', () => {
  assert.ok(voicePriority('scream', 10, false) > voicePriority('scream', 40, false));
  assert.ok(voicePriority('pant-hoot', 10, false) > voicePriority('pant-grunt', 10, false));
  assert.equal(voicePriority('bark', 10, true), 2 * voicePriority('bark', 10, false));
  assert.equal(voicePriority('scream', 200, true), 0, 'out of range is worthless');
});

test('pickSlot fills free slots, then steals only a clearly weaker voice', () => {
  const pr = new Float32Array(MAX_VOICES), act = new Uint8Array(MAX_VOICES);
  assert.equal(pickSlot(0.1, pr, act), 0);
  act.fill(1); pr.fill(0.5); pr[3] = 0.1;
  assert.equal(pickSlot(0.2, pr, act), 3, 'steals the weakest');
  assert.equal(pickSlot(0.11, pr, act), -1, 'within the margin: no thrash');
  pr[3] = 0.5;
  assert.equal(pickSlot(0.4, pr, act), -1, 'cap holds against weaker candidates');
  act[6] = 0;
  assert.equal(pickSlot(0.01, pr, act), 6);
});

test('cooldowns: per kind, per chimp (one mouth), drums exempt from the chimp limit', () => {
  const byKind: Partial<Record<CallKind, number>> = {}, byChimp = new Map<number, number>();
  assert.ok(cooldownOk(10, 'scream', 7, byKind, byChimp));
  byKind.scream = 10; byChimp.set(7, 10);
  assert.equal(cooldownOk(10.1, 'scream', 8, byKind, byChimp), false, 'kind cooldown');
  assert.ok(cooldownOk(10 + KIND.scream.kindCooldown + 1e-9, 'scream', 8, byKind, byChimp));
  assert.equal(cooldownOk(11, 'bark', 7, byKind, byChimp), false, 'same chimp too soon');
  assert.ok(cooldownOk(11, 'drum', 7, byKind, byChimp), 'drumming during a call');
  assert.ok(cooldownOk(12.5, 'bark', 7, byKind, byChimp));
  assert.ok(cooldownOk(10.5, 'bark', -1, byKind, byChimp), 'no caller id');
});

test('time scaling: all at 1 min/s, subsampled at 10 min/s, salient only at 1 h/s, none at 6 h/s or paused', () => {
  assert.equal(rateTier(0), 'paused');
  assert.equal(rateTier(60), 'full');
  assert.equal(rateTier(600), 'sub');
  assert.equal(rateTier(3600), 'salient');
  assert.equal(rateTier(3000), 'salient', 'a clock-limited 1 h/s still counts as 1 h/s');
  assert.equal(rateTier(21600), 'none');
  assert.equal(rateTier(86400), 'none');
  const admitted = (kind: CallKind, rate: number, d = 10) => { let n = 0; for (let i = 0; i < 1000; i++) if (admitAtRate(kind, rate, d, (i + 0.5) / 1000)) n++; return n / 1000; };
  for (const k of CALL_KINDS) { assert.equal(admitted(k, 60), 1); assert.equal(admitted(k, 0), 0); assert.equal(admitted(k, 21600), 0); }
  assert.equal(admitted('pant-hoot', 600), 1);
  assert.ok(admitted('pant-grunt', 600) < 0.5 && admitted('pant-grunt', 600) > 0);
  assert.equal(admitted('pant-grunt', 3600), 0);
  assert.equal(admitted('food-grunt', 3600), 0);
  assert.ok(admitted('pant-hoot', 3600) > 0 && admitted('drum', 3600) > 0, 'choruses survive at 1 h/s');
  assert.equal(admitted('scream', 3600, 10), 1, 'nearby screams survive');
  assert.equal(admitted('scream', 3600, 40), 0, 'distant screams do not');
});

test('individual voices: stable per id, higher for infants, lower for adult males, within ±10%', () => {
  assert.equal(voiceRate(42, 'female', 'adult'), voiceRate(42, 'female', 'adult'));
  let spread = 0;
  for (let id = 1; id < 400; id++) {
    for (const stage of ['infant', 'juvenile', 'adolescent', 'adult', 'elder'] as const) for (const sex of ['female', 'male'] as const) {
      const r = voiceRate(id, sex, stage);
      assert.ok(r >= 0.9 - 1e-12 && r <= 1.1 + 1e-12);
    }
    spread = Math.max(spread, Math.abs(voiceRate(id, 'female', 'adult') - 1));
    assert.ok(voiceRate(id, 'male', 'infant') > voiceRate(id, 'male', 'adult'));
  }
  assert.ok(spread > 0.02, 'individuals differ');
});

// --- Clip pools ---------------------------------------------------------------

const CLIPS: ClipMeta[] = [
  { id: 'ph-a', role: 'voice', kind: 'pant-hoot', species: 'chimpanzee' },
  { id: 'sc-a', role: 'voice', kind: 'scream', species: 'chimpanzee' },
  { id: 'bn-sc-a', role: 'voice', kind: 'scream', species: 'bonobo', optional: true },
  { id: 'bn-hh-a', role: 'voice', kind: 'pant-hoot', species: 'bonobo', optional: true },
  { id: 'bed-rain', role: 'bed', species: 'ambience' },
  { id: 'th-a', role: 'thunder', species: 'ambience' },
];

test('call kinds map to chimpanzee clips only, unless the bonobo toggle is on', () => {
  assert.deepEqual(poolFor(CLIPS, 'scream', false), ['sc-a']);
  assert.deepEqual(poolFor(CLIPS, 'pant-hoot', false), ['ph-a']);
  assert.deepEqual(poolFor(CLIPS, 'scream', true), ['sc-a', 'bn-sc-a']);
  assert.deepEqual(poolFor(CLIPS, 'pant-hoot', true), ['ph-a', 'bn-hh-a']);
  assert.deepEqual(poolFor(CLIPS, 'whimper', true), []);
});

test('the shipped manifest keeps bonobo clips optional and every recorded call kind covered', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const path = new URL('../public/audio/manifest.json', import.meta.url);
  if (!existsSync(path)) return; // assets are built by scripts/build-audio.mjs from the user's own files
  const clips = JSON.parse(readFileSync(path, 'utf8')).clips as (ClipMeta & { file: string })[];
  for (const c of clips) if (c.species === 'bonobo') assert.equal(c.optional, true, `${c.id} must be opt-in`);
  for (const k of CALL_KINDS) {
    if (k === 'drum' || k === 'laugh') { assert.equal(poolFor(clips, k, false).length, 0, `${k} is synthesized`); continue; }
    assert.ok(poolFor(clips, k, false).length > 0, `${k} has chimpanzee clips`);
    for (const id of poolFor(clips, k, false)) assert.ok(!id.startsWith('bn-'), `${id} is not a bonobo clip`);
  }
  assert.ok(clips.some(c => c.role === 'bed') && clips.some(c => c.role === 'thunder'));
});

test('every interaction mapping names a real call kind', () => {
  for (const [kind, voices] of Object.entries(INTERACTION_VOICES)) for (const v of voices!) assert.ok(CALL_KINDS.includes(v.kind), `${kind} → ${v.kind}`);
});

test('thunder: longer flash-to-bang delay is quieter and duller', () => {
  const nearT = thunderShape(1.2), farT = thunderShape(5.5);
  assert.ok(nearT.near && !farT.near);
  assert.ok(nearT.gain > farT.gain && nearT.cutoff > farT.cutoff);
  assert.ok(Math.abs(headingOf(1, 0) - Math.PI / 2) < 1e-12 && headingOf(0, -1) === 0);
});

// --- Synthesis and settings ------------------------------------------------------

test('synthesized drum and laughter are deterministic, bounded and non-silent', () => {
  const a = synthDrum(32000, 101), b = synthDrum(32000, 101), c = synthDrum(32000, 102);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  let peak = 0, low = 0, high = 0;
  for (const v of a) peak = Math.max(peak, Math.abs(v));
  assert.ok(Math.abs(peak - 0.9) < 1e-6 && a.length > 32000 * 0.8);
  // Energy sits low (thumps), with a little high-frequency slap: compare a crude low-pass and its residual.
  let lp = 0;
  for (const v of a) { lp += (v - lp) * 0.02; low += lp * lp; high += (v - lp) ** 2; }
  assert.ok(low > high, 'drum energy is mostly low-frequency');
  const l = synthLaugh(32000, 201);
  let lpk = 0; for (const v of l) lpk = Math.max(lpk, Math.abs(v));
  assert.ok(Math.abs(lpk - 0.55) < 1e-6 && l.length >= 32000 * 1.4);
  assert.deepEqual(l, synthLaugh(32000, 201));
});

test('sound settings sanitize, persist, and survive broken storage', () => {
  assert.deepEqual(sanitizeSound(null), DEFAULT_SOUND);
  assert.equal(DEFAULT_SOUND.bonobo, false, 'bonobo pool off by default');
  assert.deepEqual(sanitizeSound({ master: 3, animals: -1, muted: 'yes', bonobo: true, extra: 1 }), { ...DEFAULT_SOUND, master: 1, animals: 0, bonobo: true });
  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
  saveSound({ ...DEFAULT_SOUND, muted: true, weather: 0.3 }, store);
  assert.ok(mem.has(SOUND_KEY));
  assert.deepEqual(loadSound(store), { ...DEFAULT_SOUND, muted: true, weather: 0.3 });
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.deepEqual(loadSound(broken), DEFAULT_SOUND);
  assert.doesNotThrow(() => saveSound(DEFAULT_SOUND, broken));
  mem.set(SOUND_KEY, '{not json');
  assert.deepEqual(loadSound(store), DEFAULT_SOUND);
});
