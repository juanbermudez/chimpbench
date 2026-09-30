// Builds the sound assets in public/audio/ from the user's Epidemic Sound downloads.
// Usage: node scripts/build-audio.mjs [--src ~/Downloads] [--out public/audio]
// Needs ffmpeg (with an AAC encoder; AudioToolbox `aac_at` is preferred when present).
// The source MP3s are read only. Every derived clip is cut at a call boundary found by silence
// detection and read off a spectrogram (see public/audio/SOURCES.md for the classification notes),
// trimmed, faded, loudness-normalized (EBU R128, two-pass: measure, then one linear gain capped by
// true peak) and encoded to AAC in .m4a, which Chrome, Safari and Firefox all decode.
// Ambience beds are stereo and loop seamlessly: the tail past the loop point is crossfaded
// (equal power) into the head, so end → start continues the same sound.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const SRC = resolve(opt('src', process.env.MGOGO_AUDIO_SRC ?? join(homedir(), 'Downloads')).replace(/^~/, homedir()));
const OUT = resolve(opt('out', 'public/audio'));
const TMP = mkdtempSync(join(tmpdir(), 'mgogo-audio-'));

const ES = ' - Epidemic Sound.mp3';
const SOURCES = {
  screeches01: { file: `ES_Animals, Primate, Chimpanzee, Screeches 01${ES}`, species: 'chimpanzee' },
  screeches02: { file: `ES_Animals, Primate, Chimpanzee, Screeches 02${ES}`, species: 'chimpanzee' },
  screeches03: { file: `ES_Animals, Primate, Chimpanzee, Screeches 03${ES}`, species: 'chimpanzee' },
  vocals02: { file: `ES_Animals, Primate, Chimpanzee, Vocals 02${ES}`, species: 'chimpanzee' },
  vocals03: { file: `ES_Animals, Primate, Chimpanzee, Vocals 03${ES}`, species: 'chimpanzee' },
  whimpers01: { file: `ES_Animals, Primate, Chimpanzee, Whimpers 01${ES}`, species: 'chimpanzee' },
  whimpers02: { file: `ES_Animals, Primate, Chimpanzee, Whimpers 02${ES}`, species: 'chimpanzee' },
  whimpers03: { file: `ES_Animals, Primate, Chimpanzee, Whimpers 03${ES}`, species: 'chimpanzee' },
  roar: { file: `ES_Animals, Primate, Chimpanzee, Angry Roar, Close${ES}`, species: 'chimpanzee' },
  buzzing: { file: `ES_Animals, Primate, Chimpanzee, Buzzing, Close${ES}`, species: 'chimpanzee' },
  bnScreeches01: { file: `ES_Animals, Primate, Chimpanzee, Bonobos, Screeches 01${ES}`, species: 'bonobo' },
  bnScreeches03: { file: `ES_Animals, Primate, Chimpanzee, Bonobos, Screeches 03${ES}`, species: 'bonobo' },
  bnLoud03: { file: `ES_Animals, Primate, Chimpanzee, Bonobos, Loud Vocals 03${ES}`, species: 'bonobo' },
  bnFeeding: { file: `ES_Animals, Primate, Chimpanzee, Bonobos, Feeding Vocals${ES}`, species: 'bonobo' },
  dawn: { file: `ES_Birds, Tropical, Rainforest, Dawn, Rich, Tropical, Ambience, Little Andaman 01${ES}`, species: 'ambience' },
  night: { file: `ES_Ambience, Tropical, Mysterious Night, Cricket${ES}`, species: 'ambience' },
  rain: { file: `ES_Rain, Vegetation, Rain, Daytime, Rain Drops Hitting Palm Leaves, Little Andaman 01${ES}`, species: 'ambience' },
  stream: { file: `ES_Water, Movement, Small River, Continuous, Calm, Happy, Steady Stream 01 Schoeps (MS)${ES}`, species: 'ambience' },
  burble: { file: `ES_Water, Flow, River, Small, Soft, Burbling Between Stones${ES}`, species: 'ambience' },
  storm: { file: `ES_Weather, Storm, Strong, Storm 2, Lightning, High Mountains, Bhaleydhunga, Himalaya 04${ES}`, species: 'ambience' },
};
// Files deliberately not used, with the reason (listed in SOURCES.md).
const UNUSED = [
  [`ES_Animals, Primate, Chimpanzee, Angry Scream, Close 02${ES}`, 'Same performance as "Angry Roar, Close" 0.87–13.6 s (envelope cross-correlation r = 0.91, same call frequencies); using both would duplicate one voice.'],
  [`ES_Animals, Primate, Chimpanzee, Vocals 04${ES}`, 'Three short tonal arched calls (F0 ≈ 1.2 → 0.8 kHz); no confident call-type classification, so not used.'],
  [`ES_Animals, Primate, Chimpanzee, Bonobos, Sanctuary 01 - Epidemic Sound (1).mp3`, 'Byte-identical duplicate of Sanctuary 01 (same MD5).'],
  ...['Sanctuary 01', 'Sanctuary 02', 'Sanctuary 04', 'Sanctuary 05', 'Sanctuary 06', 'Sanctuary 08'].map(n =>
    [`ES_Animals, Primate, Chimpanzee, Bonobos, ${n}${ES}`, 'Bonobo (Pan paniscus), sanctuary recording: isolated screams and high hoots over facility noise. Not needed for the small optional pool.']),
  [`ES_Animals, Primate, Chimpanzee, Bonobos, Loud Vocals 01${ES}`, 'Bonobo high-hoot chorus, same call type as the optional clip from Loud Vocals 03. Not used.'],
  [`ES_Animals, Primate, Chimpanzee, Bonobos, Screeches 02${ES}`, 'Bonobo screams, same call type as the optional clips from Screeches 01 and 03. Not used.'],
];

const LICENSE = 'Epidemic Sound — licensed to the user\'s subscription; do not redistribute raw files or deploy publicly without checking the license.';
const SPECIES = {
  chimpanzee: 'Chimpanzee (Pan troglodytes) per the library label; subspecies, location and captive/wild status not stated',
  bonobo: 'Bonobo (Pan paniscus) per the library label ("Bonobos"); different species. Sanctuary (captive) recordings',
};

// One-shot voices. start/end in source seconds; kind is the sim CallKind; confidence is ours.
const V = (id, kind, src, start, end, confidence, note) => ({ id, role: 'voice', kind, src, start, end, confidence, note });
const VOICES = [
  V('ph-a', 'pant-hoot', 'screeches01', 0.05, 19.95, 'high', 'Complete pant-hoot: low introduction hoos, build-up of rapid inhale/exhale hoots rising in pitch, climax screams (≈10.8–14.5 s), let-down.'),
  V('ph-b', 'pant-hoot', 'vocals02', 0.45, 15.25, 'high', 'Pant-hoot: build-up of rising hoots (0.5–3.2 s), tonal climax scream (3.3–4.3 s), let-down pants, then a second series of loud arched climax calls.'),
  V('ph-c', 'pant-hoot', 'vocals02', 0.45, 9.55, 'high', 'Same call as ph-b, ending at the first let-down (a shorter pant-hoot; not an independent recording).'),
  V('sc-a', 'scream', 'screeches01', 20.0, 23.22, 'high', 'Tonal screams (flat F0 ≈ 1.2 kHz, rich harmonics, 0.3–0.5 s units), recorded right after ph-a.'),
  V('sc-b', 'scream', 'screeches01', 24.21, 30.8, 'high', 'Tonal scream bout (same series as sc-a).'),
  V('sc-c', 'scream', 'screeches01', 35.85, 40.34, 'high', 'Tonal scream bout (same series).'),
  V('sc-d', 'scream', 'screeches01', 44.01, 49.07, 'high', 'Tonal scream bout (same series).'),
  V('sc-e', 'scream', 'screeches01', 52.4, 57.07, 'high', 'Tonal scream bout (same series).'),
  V('sc-f', 'scream', 'screeches02', 0.0, 3.93, 'moderate', 'Harsh pulsed screams: broadband units with an arched F0 falling ≈ 1.5 → 0.8 kHz.'),
  V('sc-g', 'scream', 'screeches02', 6.89, 8.42, 'moderate', 'Harsh pulsed screams (same recording as sc-f).'),
  V('sc-h', 'scream', 'screeches02', 9.49, 11.73, 'moderate', 'Harsh pulsed screams (same recording).'),
  V('sc-i', 'scream', 'screeches02', 12.69, 16.66, 'moderate', 'Harsh pulsed screams (same recording).'),
  V('sc-j', 'scream', 'screeches03', 0.0, 6.85, 'high', 'Loud sustained tonal screams (F0 ≈ 1.4 kHz, 0.5–1 s units).'),
  V('bk-a', 'bark', 'roar', 0.9, 2.0, 'moderate', 'Short loud arched calls (F0 ≈ 1.4 kHz, 0.2–0.4 s) in an aggressive-context recording; classified as waa-barks.'),
  V('bk-b', 'bark', 'roar', 2.38, 3.86, 'moderate', 'Waa-barks (same recording as bk-a).'),
  V('bk-c', 'bark', 'roar', 4.28, 5.36, 'moderate', 'Waa-bark (same recording).'),
  V('bk-d', 'bark', 'roar', 5.9, 6.42, 'moderate', 'Harsh broadband bark (same recording).'),
  V('bk-e', 'bark', 'roar', 7.22, 7.72, 'moderate', 'Waa-bark (same recording).'),
  V('bk-f', 'bark', 'roar', 9.05, 10.65, 'moderate', 'Two waa-barks (same recording).'),
  V('bk-g', 'bark', 'roar', 11.26, 12.78, 'moderate', 'Harsh bark then a waa-bark (same recording).'),
  V('bk-h', 'bark', 'roar', 16.62, 18.27, 'moderate', 'Rattling harsh bark and an arched bark (same recording).'),
  V('pg-a', 'pant-grunt', 'buzzing', 0.0, 1.94, 'moderate', 'Rapid voiced grunt train (≈7 units/s, F0 ≈ 500 Hz with harmonics), louder: pant-grunts grading toward pant-barks.'),
  V('pg-b', 'pant-grunt', 'buzzing', 2.53, 4.08, 'moderate', 'Softer rapid grunt series (same recording).'),
  V('pg-c', 'pant-grunt', 'buzzing', 4.7, 6.46, 'moderate', 'Softer rapid grunt series (same recording).'),
  V('pg-d', 'pant-grunt', 'buzzing', 7.03, 7.55, 'moderate', 'Two soft grunts (same recording).'),
  V('fg-a', 'food-grunt', 'vocals03', 0.0, 1.78, 'low', 'Series of noisy, harsh grunts (≈3–4/s, energy ≈ 0.7–1.7 kHz); consistent with rough grunts, but the recording context is unknown.'),
  V('fg-b', 'food-grunt', 'vocals03', 2.38, 4.38, 'low', 'Rough-grunt-like series (same recording).'),
  V('fg-c', 'food-grunt', 'vocals03', 5.0, 8.34, 'low', 'Rough-grunt-like series (same recording).'),
  V('wh-a', 'whimper', 'whimpers01', 4.63, 8.96, 'high', 'Soft tonal hoo-whimpers (F0 ≈ 300–450 Hz) rising in pitch and intensity.'),
  V('wh-b', 'whimper', 'whimpers01', 9.19, 12.95, 'high', 'Louder whimpers with rising-falling contours (same recording).'),
  V('wh-c', 'whimper', 'whimpers01', 12.95, 16.05, 'high', 'Intense whimpers grading toward screams (same recording).'),
  V('wh-d', 'whimper', 'whimpers02', 0.0, 2.42, 'high', 'Arched tonal whimper and two soft hoos.'),
  V('wh-e', 'whimper', 'whimpers02', 8.92, 13.98, 'high', 'Whimper series escalating to high whimpers (F0 jumps to ≈ 1.1 kHz).'),
  V('wh-f', 'whimper', 'whimpers03', 4.73, 7.17, 'high', 'Rising tonal whimpers.'),
  V('wh-g', 'whimper', 'whimpers03', 9.35, 13.56, 'moderate', 'Rapid pulsed whimper series (sob-like).'),
  V('ah-a', 'alarm-hoo', 'whimpers01', 0.42, 1.12, 'proxy', 'Single soft flat hoo (F0 ≈ 400 Hz) excerpted from a whimper recording. Hoo acoustics, but NOT recorded in an alarm context.'),
  V('ah-b', 'alarm-hoo', 'whimpers01', 16.7, 17.58, 'proxy', 'Single flat hoo (F0 ≈ 300 Hz) from a whimper recording; alarm-context proxy.'),
  V('ah-c', 'alarm-hoo', 'whimpers01', 17.95, 18.8, 'proxy', 'Single flat hoo from a whimper recording; alarm-context proxy.'),
  V('ah-d', 'alarm-hoo', 'whimpers03', 0.38, 1.45, 'proxy', 'Long flat hoo (F0 ≈ 280 Hz) from a whimper recording; alarm-context proxy.'),
  V('ah-e', 'alarm-hoo', 'whimpers03', 3.12, 3.95, 'proxy', 'Flat hoo from a whimper recording; alarm-context proxy.'),
  // Optional pool behind the "Fill gaps with bonobo recordings" setting (off by default).
  { ...V('bn-sc-a', 'scream', 'bnScreeches01', 0.25, 8.25, 'high', 'Bonobo screams (F0 ≈ 3–3.5 kHz, roughly an octave above chimpanzee screams).'), optional: true },
  { ...V('bn-sc-b', 'scream', 'bnScreeches03', 1.7, 11.75, 'high', 'Bonobo tonal screams (F0 ≈ 2.6 kHz).'), optional: true },
  { ...V('bn-hh-a', 'pant-hoot', 'bnLoud03', 3.7, 11.8, 'proxy', 'Bonobo high-hoot chorus. Bonobos have no pant-hoot; this stands in for a long-distance call only.'), optional: true },
  { ...V('bn-fp-a', 'food-grunt', 'bnFeeding', 0.4, 4.6, 'proxy', 'Bonobo food peeps (high-pitched), standing in for chimpanzee rough grunts; captive, with facility hum.'), optional: true },
];
const BEDS = [
  { id: 'bed-dawn', bed: 'dawn', src: 'dawn', start: 20, end: 96, xf: 4, note: 'Rich dawn bird chorus with an insect tone near 3.2 kHz.' },
  { id: 'bed-night', bed: 'night', src: 'night', start: 0.5, end: 66, xf: 3.5, note: 'Night crickets and katydids (steady 2.4 kHz tone, pulsed 6 kHz insect).' },
  { id: 'bed-rain', bed: 'rain', src: 'rain', start: 30, end: 92, xf: 4, note: 'Rain drops on palm leaves, daytime.' },
  { id: 'bed-stream', bed: 'stream', src: 'stream', start: 10, end: 52, xf: 3, note: 'Small river, steady flow (MS stereo).' },
  { id: 'bed-burble', bed: 'burble', src: 'burble', start: 10, end: 50, xf: 3, note: 'Small river burbling between stones (near-field detail).' },
  { id: 'bed-storm', bed: 'storm', src: 'storm', start: 29, end: 50, xf: 2.5, note: 'Storm wind and rain between thunder claps (thunder is played separately).', maxGain: 14 },
];
const THUNDER = [
  { id: 'th-a', src: 'storm', start: 20.8, end: 30.5, near: true, note: 'Close thunder clap with a short roll.' },
  { id: 'th-b', src: 'storm', start: 53.2, end: 66.5, near: true, note: 'Loud clap and long roll.' },
  { id: 'th-c', src: 'storm', start: 84.7, end: 96.2, near: false, note: 'Distant rolling thunder.' },
  { id: 'th-d', src: 'storm', start: 96.2, end: 110.5, near: true, note: 'Crack and roll.' },
  { id: 'th-e', src: 'storm', start: 4.0, end: 7.8, near: false, note: 'Short rumble.' },
];

const TARGET = { voice: -20, bed: -24, thunder: -18 };
const CEILING = -1.5; // dBTP before encoding; AAC can add a few tenths
const BITRATE = { voice: '72k', bed: '128k', thunder: '64k' };

function run(args, input) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, input });
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}\n${r.stderr.slice(-2000)}`);
  return r.stderr;
}
const encoders = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout ?? '';
// AudioToolbox AAC sounds better at low bitrates (one-shots), but it records ~11 ms of end padding in the container
// duration, which would put a gap at a loop point; beds use ffmpeg's native encoder, whose duration is exact.
const AAC = /\baac_at\b/.test(encoders) ? 'aac_at' : 'aac';
const BED_AAC = 'aac';

/** Integrated loudness (LUFS) and true peak (dBTP) via ffmpeg ebur128. */
function measure(file) {
  const log = run(['-nostats', '-i', file, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']);
  const summary = log.slice(log.lastIndexOf('Summary:'));
  const I = Number(/I:\s+(-?[\d.]+|-inf) LUFS/.exec(summary)?.[1] ?? NaN);
  const tp = Number(/Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(summary)?.[1] ?? NaN);
  return { I: Number.isFinite(I) ? I : -70, tp: Number.isFinite(tp) ? tp : -70 };
}
function duration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return Number(r.stdout.trim());
}
const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
function sourcePath(key) {
  const p = join(SRC, SOURCES[key].file);
  if (!existsSync(p)) throw new Error(`Missing source "${SOURCES[key].file}" in ${SRC}. Pass --src <dir> or set MGOGO_AUDIO_SRC.`);
  return p;
}

/** Gain that reaches the loudness target without pushing the true peak over the ceiling. */
function gainFor(m, target, maxGain = 30) { return Math.min(target - m.I, CEILING - m.tp, maxGain); }

function encode(wav, out, role, gainDb, channels) {
  const af = [`volume=${gainDb.toFixed(2)}dB`];
  // Beds keep their level; a limiter only shaves sparse transients (rain drops) that would cross the ceiling.
  if (role === 'bed') af.push('alimiter=limit=0.84:attack=3:release=60:level=disabled');
  run(['-y', '-i', wav, '-af', af.join(','), '-ac', String(channels), '-ar', '48000', '-c:a', role === 'bed' ? BED_AAC : AAC, '-b:a', BITRATE[role], '-movflags', '+faststart', out]);
}

function oneShot(item, dir, role) {
  const tmp = join(TMP, `${item.id}.wav`);
  const len = item.end - item.start;
  const fadeOut = role === 'thunder' ? Math.min(2, len * 0.3) : Math.min(0.03, len * 0.1);
  const chain = [
    role === 'thunder' ? 'highpass=f=25' : 'highpass=f=70',
    `afade=t=in:st=0:d=${role === 'thunder' ? 0.02 : 0.008}`,
    `afade=t=out:st=${(len - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)}`,
  ].join(',');
  // Mono: average both channels of stereo sources.
  // -ss/-t as input options: the filters then see the clip's own timestamps (fades land on the clip, not the file).
  run(['-y', '-ss', String(item.start), '-t', len.toFixed(3), '-i', sourcePath(item.src), '-af', `pan=mono|c0=0.5*c0+0.5*c1,${chain}`, '-ar', '48000', '-c:a', 'pcm_s16le', tmp]);
  const m = measure(tmp);
  const gain = gainFor(m, TARGET[role]);
  const rel = `${dir}/${item.id}.m4a`;
  encode(tmp, join(OUT, rel), role, gain, 1);
  const after = measure(join(OUT, rel));
  return { rel, gain, after, duration: duration(join(OUT, rel)) };
}

function bed(item) {
  const raw = join(TMP, `${item.id}-raw.wav`), loop = join(TMP, `${item.id}.wav`);
  const L = item.end - item.start, X = item.xf;
  run(['-y', '-ss', String(item.start), '-t', (L + X).toFixed(3), '-i', sourcePath(item.src), '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', raw]);
  // Seamless loop: head fades in under the tail (equal power), then the body; output length L.
  const graph = `[0:a]asplit=3[h][m][t];[h]atrim=0:${X},asetpts=PTS-STARTPTS,afade=t=in:d=${X}:curve=qsin[hf];` +
    `[t]atrim=${L}:${L + X},asetpts=PTS-STARTPTS,afade=t=out:d=${X}:curve=qsin[tf];[hf][tf]amix=inputs=2:normalize=0[x];` +
    `[m]atrim=${X}:${L},asetpts=PTS-STARTPTS[b];[x][b]concat=n=2:v=0:a=1[o]`;
  run(['-y', '-i', raw, '-filter_complex', graph, '-map', '[o]', '-c:a', 'pcm_s16le', loop]);
  const m = measure(loop);
  const gain = gainFor({ I: m.I, tp: -99 }, TARGET.bed, item.maxGain ?? 30); // the limiter handles peaks
  const rel = `bed/${item.id}.m4a`;
  encode(loop, join(OUT, rel), 'bed', gain, 2);
  return { rel, gain, after: measure(join(OUT, rel)), duration: duration(join(OUT, rel)), seam: seamCheck(join(OUT, rel)) };
}

/** Largest 10 ms RMS step (dB) across the loop point of the encoded bed, vs the median step elsewhere. */
function seamCheck(file) {
  const raw = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], { maxBuffer: 256 * 1024 * 1024 }).stdout;
  // ffmpeg keeps the encoder's end padding (~20 ms of silence past the edit-list duration); a player loops at the
  // container duration, so the check does too.
  const x = new Float32Array(raw.buffer, raw.byteOffset, Math.min(Math.floor(raw.length / 4), Math.round(duration(file) * 8000)));
  const W = 80; // 10 ms at 8 kHz
  const rms = (i0) => { let s = 0; for (let i = 0; i < W; i++) { const v = x[(i0 + i + x.length) % x.length]; s += v * v; } return 10 * Math.log10(s / W + 1e-12); };
  const steps = [];
  for (let i = W; i + W < x.length; i += W) steps.push(Math.abs(rms(i) - rms(i - W)));
  steps.sort((a, b) => a - b);
  const seam = Math.max(Math.abs(rms(0) - rms(x.length - W)), Math.abs(rms(W) - rms(0)));
  return { seamStepDb: round(seam), medianStepDb: round(steps[Math.floor(steps.length / 2)]), p99StepDb: round(steps[Math.floor(steps.length * 0.99)]) };
}

// ---------------------------------------------------------------------------
if (existsSync(OUT)) for (const d of ['voice', 'bonobo', 'bed', 'thunder']) rmSync(join(OUT, d), { recursive: true, force: true });
for (const d of ['voice', 'bonobo', 'bed', 'thunder']) mkdirSync(join(OUT, d), { recursive: true });
console.log(`source ${SRC}\nout    ${OUT}\nAAC encoder: ${AAC}`);

const clips = [];
const src = key => ({ source: SOURCES[key].file, species: SOURCES[key].species });
for (const v of VOICES) {
  const r = oneShot(v, v.optional ? 'bonobo' : 'voice', 'voice');
  clips.push({ id: v.id, role: 'voice', kind: v.kind, file: r.rel, duration: round(r.duration), lufs: round(r.after.I, 1), truePeak: round(r.after.tp, 1), gainDb: round(r.gain, 1),
    ...src(v.src), sourceStart: v.start, sourceEnd: v.end, confidence: v.confidence, optional: !!v.optional, note: v.note });
  console.log(`${v.id.padEnd(8)} ${v.kind.padEnd(10)} ${r.duration.toFixed(2)} s  ${r.after.I.toFixed(1)} LUFS  ${r.after.tp.toFixed(1)} dBTP`);
}
for (const t of THUNDER) {
  const r = oneShot(t, 'thunder', 'thunder');
  clips.push({ id: t.id, role: 'thunder', near: t.near, file: r.rel, duration: round(r.duration), lufs: round(r.after.I, 1), truePeak: round(r.after.tp, 1), gainDb: round(r.gain, 1),
    ...src(t.src), sourceStart: t.start, sourceEnd: t.end, note: t.note });
  console.log(`${t.id.padEnd(8)} thunder    ${r.duration.toFixed(2)} s  ${r.after.I.toFixed(1)} LUFS  ${r.after.tp.toFixed(1)} dBTP`);
}
for (const b of BEDS) {
  const r = bed(b);
  clips.push({ id: b.id, role: 'bed', bed: b.bed, file: r.rel, duration: round(r.duration), lufs: round(r.after.I, 1), truePeak: round(r.after.tp, 1), gainDb: round(r.gain, 1),
    ...src(b.src), sourceStart: b.start, sourceEnd: b.end + b.xf, loopCrossfade: b.xf, seam: r.seam, note: b.note });
  console.log(`${b.id.padEnd(10)} ${r.duration.toFixed(2)} s  ${r.after.I.toFixed(1)} LUFS  ${r.after.tp.toFixed(1)} dBTP  seam ${JSON.stringify(r.seam)}`);
}

const synth = [
  { id: 'drum', kind: 'drum', note: 'Buttress drumming has no recording here: synthesized at load time in src/audio/synth.ts (50–120 Hz thumps with a short broadband transient, in irregular bursts). Stylization.' },
  { id: 'laugh', kind: 'laugh', note: 'No recording of chimpanzee laughter (play pant) among the sources: synthesized breathy panting in src/audio/synth.ts. Stylization.' },
];
const bytes = clips.reduce((s, c) => s + statSync(join(OUT, c.file)).size, 0);
const manifest = { version: 1, generated: new Date().toISOString(), encoder: { voice: AAC, bed: BED_AAC }, license: LICENSE, totalBytes: bytes, synthesized: synth, clips };
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));

// Provenance document.
const md = [];
md.push('# ChimpBench sound sources', '', `Generated by \`node scripts/build-audio.mjs\` on ${manifest.generated.slice(0, 10)}. Do not edit by hand.`, '');
md.push(`**License.** ${LICENSE}`, '');
md.push('**Species.** Files labelled "Chimpanzee" are used as chimpanzee voices; the library does not state subspecies, site or whether animals were captive. Files labelled "Chimpanzee, Bonobos" are bonobo (Pan paniscus) recordings, mostly from a sanctuary. Bonobo calls are higher-pitched and structurally different (no pant-hoot), so they are never used as chimpanzee voices by default; a small processed pool is available behind Settings › Sound › "Fill gaps with bonobo recordings (different species)", off by default.', '');
md.push('**Ambience is not from Kibale.** The dawn chorus and rain were recorded on Little Andaman (Andaman Islands, India) and the storm in the Himalaya (Bhaleydhunga, Nepal). They are stylized stand-ins for Kibale soundscapes, not field recordings of the site.', '');
md.push('**Classification method.** Each chimpanzee file was decoded, rendered as a spectrogram (sox) and segmented with ffmpeg silence detection; call types were assigned from structure (pant-hoot: intro hoos → rising build-up → climax screams → let-down; scream: long loud tonal or harsh units; whimper: soft low tonal hoos; waa-bark: short loud arched calls; pant-grunt: rapid voiced grunt trains; rough grunt: noisy grunt series). Confidence: high = textbook structure; moderate = structure fits but alternatives exist; low = plausible only; proxy = acoustically similar call used for a different context.', '');
md.push('**Gaps.** No recording of buttress drumming or laughter (play pant): both are synthesized (stylizations). No alarm-context hoo recording: `alarm-hoo` uses single flat hoo elements cut from whimper recordings (proxy). Food grunts are low-confidence.', '');
md.push('## Derived clips', '', '| Clip | Use | Species | Source file | Source span (s) | Confidence | Notes |', '| --- | --- | --- | --- | --- | --- | --- |');
for (const c of clips) {
  const use = c.role === 'voice' ? `${c.kind}${c.optional ? ' (optional pool)' : ''}` : c.role === 'bed' ? `bed: ${c.bed} (loop ${c.duration} s)` : `thunder${c.near ? ' (near)' : ' (distant)'}`;
  const species = c.species === 'ambience' ? (/(Andaman)/.test(c.source) ? 'ambience, Little Andaman (India)' : /Himalaya/.test(c.source) ? 'ambience, Himalaya (Nepal)' : 'ambience, location not stated') : SPECIES[c.species];
  md.push(`| \`${c.file}\` | ${use} | ${species} | ${c.source} | ${c.sourceStart}–${c.sourceEnd} | ${c.confidence ?? '—'} | ${c.note} |`);
}
for (const s of synth) md.push(`| (synthesized) | ${s.kind} | — | — | — | stylization | ${s.note} |`);
md.push('', '## Source files not used', '', ...UNUSED.map(([f, why]) => `- ${f}: ${why}`), '');
md.push('## Processing', '', `One-shots: mono, 70 Hz high-pass, 8 ms fade-in and ≤ 30 ms fade-out, normalized to ${TARGET.voice} LUFS integrated (true peak capped at ${CEILING} dBTP before encoding), AAC ${BITRATE.voice} in .m4a.`,
  `Beds: stereo, seamless loops (tail crossfaded into head with an equal-power curve), normalized to ${TARGET.bed} LUFS with a transient limiter at −1.5 dBFS, AAC ${BITRATE.bed}.`,
  `Thunder: mono, normalized to ${TARGET.thunder} LUFS (true peak capped), AAC ${BITRATE.thunder}. Total: ${(bytes / 1e6).toFixed(2)} MB.`, '');
writeFileSync(join(OUT, 'SOURCES.md'), md.join('\n'));
rmSync(TMP, { recursive: true, force: true });
console.log(`\n${clips.length} clips, ${(bytes / 1e6).toFixed(2)} MB → ${OUT}`);
