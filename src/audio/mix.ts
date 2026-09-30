import type { CallKind, InteractionKind, LifeStage, Sex, Stream, ViewMode, Weather } from '../types';

// Pure mixing and voice-selection math for the sound engine (src/audio/engine.ts). No Web Audio here, so
// tests/audio.test.ts can check it in Node. Every number is a design assumption, checked against the
// scripts/audio-probe.mjs recordings (artifacts/audio/) unless it says otherwise; ranges are scaled to the 160 m map like the
// simulation's hearing radii (real pant-hoots carry 1–2 km).

export interface KindSpec {
  /** Metres beyond which the call is inaudible (map-scaled; the sim's own hearing radii are smaller). */
  range: number;
  /** Source level, linear, applied on top of the clip's -20 LUFS normalization (natural loudness order). */
  level: number;
  /** Priority weight when voices compete (screams and alarms win over routine grunts). */
  severity: number;
  /** Real seconds between two starts of this kind anywhere (choruses stagger instead of stacking). */
  kindCooldown: number;
}

// Design assumption: pant-hoot and drum carry farthest; screams and barks are loud; grunts, whimpers and
// laughter are close-range calls (the sim's radii keep the same order: 36/30/20/18/15/10/8/6/5 m).
export const KIND: Record<CallKind, KindSpec> = {
  'pant-hoot': { range: 110, level: 1.0, severity: 1.2, kindCooldown: 0.8 },
  drum: { range: 120, level: 1.0, severity: 1.2, kindCooldown: 0.5 },
  scream: { range: 60, level: 0.8, severity: 1.5, kindCooldown: 0.35 },
  bark: { range: 50, level: 0.7, severity: 1.3, kindCooldown: 0.3 },
  'alarm-hoo': { range: 30, level: 0.4, severity: 1.3, kindCooldown: 1.0 },
  'food-grunt': { range: 22, level: 0.35, severity: 0.8, kindCooldown: 1.2 },
  'pant-grunt': { range: 15, level: 0.32, severity: 1.0, kindCooldown: 0.8 },
  whimper: { range: 12, level: 0.28, severity: 1.0, kindCooldown: 2.0 },
  laugh: { range: 12, level: 0.28, severity: 0.8, kindCooldown: 1.5 },
  // C10 travel hoo: low-intensity, short-range (gruberZuberbuhler2013); no clip yet, so its pool is empty and it stays silent
  'travel-hoo': { range: 12, level: 0.25, severity: 0.7, kindCooldown: 1.5 },
  // C8 cough of a sick animal in a respiratory outbreak (negrey2019): close-range; no clip, so it stays silent
  cough: { range: 12, level: 0.25, severity: 0.8, kindCooldown: 2.0 },
};
export const CALL_KINDS = Object.keys(KIND) as CallKind[];
/** Kinds with no recording: synthesized at load time (src/audio/synth.ts). Stylization. */
export const SYNTH_KINDS: readonly CallKind[] = ['drum', 'laugh'];
/** Kinds with neither a recording nor a synth yet (C10 travel hoo): their pool stays empty and they are silent. */
export const SILENT_KINDS: readonly CallKind[] = ['travel-hoo', 'cough'];
export const REF_DISTANCE = 5;   // m: full level inside this radius
/** Distance law exponent: 1 would be spherical spreading (−6 dB per doubling); 0.75 (−4.5 dB) keeps calls in the
 *  close-view frame readable over the ambience while the low-pass carries the distance cue. Design assumption. */
export const ROLLOFF = 0.75;
export const MAX_VOICES = 8;
/** One mouth: a chimp starts at most one call per this many real seconds (drums are exempt). */
export const CHIMP_COOLDOWN = 2;
/** A new voice steals the weakest playing one only when clearly more important (no thrashing). */
export const STEAL_MARGIN = 1.25;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Distance, absorption and zoom
// ---------------------------------------------------------------------------

/** Linear gain for a call heard d metres away: (5/d)^0.75 beyond REF_DISTANCE, faded to 0 at the kind's range. */
export function distanceGain(d: number, kind: CallKind): number {
  const r = KIND[kind].range;
  return Math.pow(REF_DISTANCE / Math.max(REF_DISTANCE, d), ROLLOFF) * (1 - smoothstep(0.7 * r, r, d));
}

/** Low-pass cutoff (Hz) for air and foliage absorption: highs fade with distance (≈1.7 kHz at 100 m). */
export function absorptionCutoff(d: number): number {
  return Math.min(16000, Math.max(900, 16000 / (1 + Math.max(0, d) / 12)));
}

/** Animal bus gain from the camera: full in close and cinematic views; the overview fades to ambience only. */
export function animalZoomGain(view: ViewMode, zoom01: number): number {
  if (view !== 'rts') return 1;
  return 1 - smoothstep(0.4, 0.9, zoom01);
}
/** Ambience is slightly louder and wider when zoomed out (the ear "covers" more forest). */
export const ambienceZoomGain = (zoom01: number) => 1 + 0.2 * clamp01(zoom01);
export const ambienceWidth = (zoom01: number) => 1 + 0.35 * clamp01(zoom01);

/** zoom01 from the visible frame height at the focus: 8 m (close) → 0, 120 m (whole map) → 1, log scale. */
export function zoomFromFrameHeight(metres: number): number {
  return clamp01(Math.log(Math.max(1e-3, metres) / 8) / Math.log(120 / 8));
}

// ---------------------------------------------------------------------------
// Beds
// ---------------------------------------------------------------------------

/**
 * Bird chorus level by clock hour: dawn chorus peaks ≈05:45–07:30, a lower daytime level, a softer dusk
 * chorus ≈17:45–19:00, silence at night. Sunrise is ≈06:49 and sunset ≈18:49 in late September at Kibale
 * (docs/simulation.md §14). Stylized curve.
 */
export function birdChorus(hour: number): number {
  const h = ((hour % 24) + 24) % 24, DAY = 0.3, DUSK = 0.65;
  if (h < 5.25 || h >= 19.75) return 0;
  if (h < 5.75) return smoothstep(5.25, 5.75, h);
  if (h < 7.5) return 1;
  if (h < 8.5) return lerp(1, DAY, smoothstep(7.5, 8.5, h));
  if (h < 17.25) return DAY;
  if (h < 17.75) return lerp(DAY, DUSK, smoothstep(17.25, 17.75, h));
  if (h < 19) return DUSK;
  return DUSK * (1 - smoothstep(19, 19.75, h));
}
/** Night insects follow the light, not the clock: full when daylight is near 0. */
export const nightInsects = (daylight: number) => 1 - smoothstep(0.03, 0.4, daylight);
/** Rain bed level from rain intensity (0..1, 1 ≈ 30 mm/h): audible from a drizzle, full from ≈18 mm/h. */
export const rainLevel = (rain: number) => (rain <= 0.01 ? 0 : Math.pow(clamp01(rain / 0.6), 0.6));
/** Water bed: stream (heard over a zoom-dependent radius) and near-field burble (close views only). */
export function streamGain(d: number, zoom01: number): number {
  const z = clamp01(zoom01), r = 5 + 25 * z;
  return (1 - 0.5 * z) / (1 + (Math.max(0, d) / r) ** 2);
}
export function burbleGain(d: number, zoom01: number): number {
  return (1 - clamp01(zoom01)) / (1 + (Math.max(0, d) / 2.5) ** 2);
}
export const streamCutoff = (d: number) => Math.min(16000, Math.max(800, 16000 / (1 + Math.max(0, d) / 8)));
/** Stereo position of the stream: the side it is on, collapsing to the centre when standing at the bank. */
export const streamPan = (relativeAzimuth: number, d: number) => Math.sin(relativeAzimuth) * 0.8 * smoothstep(1, 8, d);

export interface BedInput {
  hour: number; daylight: number; weather: Weather; rain: number; zoom01: number;
  /** Metres from the listener to the nearest stream bank (Infinity when there is no stream). */
  streamDistance: number;
  /** Ecological hours per real second; above ≈3 h/s the mix eases to a steady daytime bed like the lighting does. */
  hoursPerSecond: number;
}
export interface BedLevels { dawn: number; night: number; rain: number; storm: number; stream: number; burble: number; }
export const emptyLevels = (): BedLevels => ({ dawn: 0, night: 0, rain: 0, storm: 0, stream: 0, burble: 0 });

/** Target level (0..1) of every bed. Writes into out (no allocation). */
export function bedLevels(i: BedInput, out: BedLevels): BedLevels {
  const wet = smoothstep(0.08, 0.6, i.rain);
  // Fast playback would strobe dawn/night; ease toward a steady mid-morning mix (scene.ts steadyLighting does the same).
  const steady = smoothstep(3, 12, i.hoursPerSecond);
  out.dawn = lerp(birdChorus(i.hour), birdChorus(10), steady) * (1 - 0.75 * wet);
  out.night = lerp(nightInsects(i.daylight), 0, steady) * (1 - 0.6 * wet);
  out.rain = rainLevel(i.rain);
  out.storm = i.weather === 'storm' ? smoothstep(0.3, 0.75, i.rain) : 0;
  out.stream = Number.isFinite(i.streamDistance) ? streamGain(i.streamDistance, i.zoom01) : 0;
  out.burble = Number.isFinite(i.streamDistance) ? burbleGain(i.streamDistance, i.zoom01) : 0;
  return out;
}

/** Nearest point on the stream bank to (x, z). Writes out.x/out.z/out.d (d = metres from the bank, 0 inside the channel). */
export function nearestOnStream(stream: Stream | undefined, x: number, z: number, out: { x: number; z: number; d: number }): boolean {
  const p = stream?.points;
  out.d = Infinity;
  if (!p || p.length < 2) return false;
  let best = Infinity;
  for (let i = 1; i < p.length; i++) {
    const ax = p[i - 1][0], az = p[i - 1][2], bx = p[i][0], bz = p[i][2];
    const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
    const t = len2 > 0 ? clamp01(((x - ax) * dx + (z - az) * dz) / len2) : 0;
    const qx = ax + dx * t, qz = az + dz * t, d2 = (x - qx) ** 2 + (z - qz) ** 2;
    if (d2 < best) { best = d2; out.x = qx; out.z = qz; }
  }
  out.d = Math.max(0, Math.sqrt(best) - (stream?.halfWidth ?? 0));
  return true;
}

/** Heading of (dx, dz) with 0 = north (−z), clockwise, like the listener yaw and the sun azimuth. */
export const headingOf = (dx: number, dz: number) => Math.atan2(dx, -dz);

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------

/** Importance of a voice: loudness × proximity × severity, doubled for the selected chimp. */
export function voicePriority(kind: CallKind, d: number, selected: boolean, severity = 1): number {
  const k = KIND[kind];
  return k.level * distanceGain(d, kind) * k.severity * severity * (selected ? 2 : 1);
}

/** Slot for a new voice: a free slot, else the weakest playing voice if the candidate clearly beats it, else −1. */
export function pickSlot(candidate: number, priorities: ArrayLike<number>, active: ArrayLike<boolean | number>): number {
  let weakest = -1, low = Infinity;
  for (let i = 0; i < priorities.length; i++) {
    if (!active[i]) return i;
    if (priorities[i] < low) { low = priorities[i]; weakest = i; }
  }
  return weakest >= 0 && candidate > low * STEAL_MARGIN ? weakest : -1;
}

/** Per-kind and per-chimp cooldowns (real seconds). chimpId < 0 (no caller) skips the chimp check; drums skip it too. */
export function cooldownOk(now: number, kind: CallKind, chimpId: number, lastByKind: Partial<Record<CallKind, number>>, lastByChimp: Map<number, number>): boolean {
  if (now - (lastByKind[kind] ?? -1e9) < KIND[kind].kindCooldown) return false;
  if (chimpId < 0 || kind === 'drum') return true;
  return now - (lastByChimp.get(chimpId) ?? -1e9) >= CHIMP_COOLDOWN;
}

export type RateTier = 'paused' | 'full' | 'sub' | 'salient' | 'none';
/**
 * Playback-speed tier from ecological seconds per real second. Boundaries sit halfway (in log space)
 * between the presets: 1 min/s full, 10 min/s subsampled, 1 h/s salient calls only, 6 h/s and faster none.
 */
export function rateTier(simRate: number): RateTier {
  if (!(simRate > 0)) return 'paused';
  if (simRate < 190) return 'full';
  if (simRate < 1470) return 'sub';
  if (simRate < 8820) return 'salient';
  return 'none';
}
const SUB_KEEP: Record<CallKind, number> = {
  'pant-hoot': 1, drum: 1, scream: 0.8, bark: 0.6, 'alarm-hoo': 0.6, 'food-grunt': 0.3, 'pant-grunt': 0.3, whimper: 0.3, laugh: 0.3, 'travel-hoo': 0.3, cough: 0.3,
};
/** Whether a call may start at this playback speed. roll is a uniform 0..1 draw (injected for tests). */
export function admitAtRate(kind: CallKind, simRate: number, d: number, roll: number): boolean {
  switch (rateTier(simRate)) {
    case 'full': return true;
    case 'sub': return roll < SUB_KEEP[kind];
    case 'salient': return ((kind === 'pant-hoot' || kind === 'drum') && roll < 0.5) || (kind === 'scream' && d < 25);
    default: return false;
  }
}

/** Integer hash → 0..1 (stable per id). */
export function hash01(id: number): number {
  let h = (id | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const STAGE_SHIFT: Record<LifeStage, number> = { infant: 0.09, juvenile: 0.06, adolescent: 0.02, adult: 0, elder: -0.01 };
/**
 * Playback rate giving each individual a stable voice: ±4% from its id, higher for infants and juveniles,
 * lower for adult males; clamped to ±10%. Stylization (real individual voice cues are spectral, not just pitch).
 */
export function voiceRate(id: number, sex: Sex, stage: LifeStage): number {
  let r = (hash01(id) - 0.5) * 0.08 + STAGE_SHIFT[stage];
  if (sex === 'male' && (stage === 'adult' || stage === 'elder')) r -= 0.04;
  return 1 + Math.min(0.1, Math.max(-0.1, r));
}

export interface ClipMeta { id: string; role: 'voice' | 'bed' | 'thunder'; kind?: CallKind; species: string; optional?: boolean; }
/** Clip ids for a call kind: chimpanzee recordings only, plus the optional bonobo pool when the user enabled it. */
export function poolFor(clips: readonly ClipMeta[], kind: CallKind, bonobo: boolean): string[] {
  return clips.filter(c => c.role === 'voice' && c.kind === kind && (c.species === 'chimpanzee' ? !c.optional : bonobo && c.species === 'bonobo')).map(c => c.id);
}

/** Voices implied by salient interactions (calls from the sim cover the rest; cooldowns drop duplicates). */
export const INTERACTION_VOICES: Partial<Record<InteractionKind, readonly { who: 'actor' | 'target'; kind: CallKind; severity: number }[]>> = {
  fight: [{ who: 'target', kind: 'scream', severity: 1.3 }, { who: 'actor', kind: 'bark', severity: 1.1 }],
  coalition: [{ who: 'target', kind: 'scream', severity: 1.3 }],
  kill: [{ who: 'target', kind: 'scream', severity: 1.8 }, { who: 'actor', kind: 'bark', severity: 1.4 }],
  infanticide: [{ who: 'target', kind: 'scream', severity: 1.8 }],
  takeover: [{ who: 'actor', kind: 'bark', severity: 1.3 }, { who: 'target', kind: 'scream', severity: 1.3 }],
  chase: [{ who: 'target', kind: 'scream', severity: 1.2 }],
  charge: [{ who: 'target', kind: 'scream', severity: 1.1 }],
  intergroup: [{ who: 'actor', kind: 'bark', severity: 1.2 }],
  alarm: [{ who: 'actor', kind: 'alarm-hoo', severity: 1 }],
  display: [{ who: 'actor', kind: 'drum', severity: 1 }],
  'rain-display': [{ who: 'actor', kind: 'drum', severity: 1.1 }],
  play: [{ who: 'actor', kind: 'laugh', severity: 1 }, { who: 'target', kind: 'laugh', severity: 0.9 }],
  'pant-grunt': [{ who: 'actor', kind: 'pant-grunt', severity: 1 }],
  beg: [{ who: 'actor', kind: 'whimper', severity: 0.8 }],
  hunt: [{ who: 'actor', kind: 'bark', severity: 1 }],
};

/** Thunder: delay after the flash (s) → gain and low-pass, since delay stands for distance (≈340 m/s). */
export function thunderShape(delaySeconds: number): { gain: number; cutoff: number; near: boolean } {
  const t = Math.min(6, Math.max(1, delaySeconds));
  return { gain: lerp(1, 0.45, (t - 1) / 5), cutoff: lerp(12000, 1800, (t - 1) / 5), near: t < 2.5 };
}
