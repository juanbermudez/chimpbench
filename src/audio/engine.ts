import type { CallKind, Chimp, ListenerPose, World } from '../types';
import {
  CALL_KINDS, INTERACTION_VOICES, KIND, MAX_VOICES, SYNTH_KINDS, absorptionCutoff, admitAtRate, ambienceWidth, ambienceZoomGain,
  animalZoomGain, bedLevels, cooldownOk, distanceGain, emptyLevels, headingOf, nearestOnStream, pickSlot, poolFor, rateTier,
  streamCutoff, streamPan, thunderShape, voicePriority, voiceRate, type BedLevels, type ClipMeta,
} from './mix';
import { synthDrum, synthLaugh } from './synth';
import { loadSound, saveSound, type SoundSettings } from './settings';
import { hyp2 } from '../render/fastmath';

// Spatial, simulation-driven sound (Web Audio). Reads World and the scene's listener pose; never writes either.
//
// Graph:  voices (buffer → envelope → low-pass → gain → equal-power panner) ─→ animals ─┐
//         dawn / night beds ─→ ambience ─→ M/S width ───────────────────────────────────┤
//         stream / burble beds ─→ pan → low-pass ─→ water ──────────────────────────────┼─→ master → limiter → trim → out
//         rain / storm beds, thunder ─→ weather ──────────────────────────────────────────┘
// - Lifecycle: the AudioContext is created on the first click or key (autoplay policy), suspended while muted or
//   hidden, and the assets load after the first frame, so startup never waits for sound.
// - Memory: beds stream through <audio> elements (two per bed, crossfaded at the loop point, so no decoded
//   minute-long float buffers and no seam); one-shots decode at 32 kHz and thunder at 24 kHz (≈25 MB in all).
// - Cost: all work runs at 20 Hz on new calls/interactions only (never per chimp per frame), with pooled voice slots.

type Status = 'locked' | 'running' | 'suspended' | 'unavailable';
type BedName = keyof BedLevels;
const BED_NAMES: BedName[] = ['dawn', 'night', 'rain', 'storm', 'stream', 'burble'];
/** Level of each bed at target 1, relative to its −24 LUFS file (storm's file is −35 LUFS). Set from scripts/audio-probe.mjs measurements. */
const BED_TRIM: Record<BedName, number> = { dawn: 0.85, night: 0.7, rain: 0.95, storm: 1.8, stream: 0.75, burble: 0.6 };
/** Seconds for bed levels to settle (setTargetAtTime τ); stream follows the camera faster. */
const BED_TAU: Record<BedName, number> = { dawn: 2, night: 2, rain: 1.5, storm: 1.5, stream: 0.35, burble: 0.35 };
const UPDATE_SECONDS = 0.05;
const BED_XF = 3;            // s of crossfade between the two elements of a bed at its loop point
const VOICE_RATE = 32000, THUNDER_RATE = 24000;
const THUNDER_COOLDOWN = 5;  // real seconds between thunder claps
const LIMITER = { threshold: -6, knee: 3, ratio: 12, attack: 0.003, release: 0.25 };
// The Web Audio compressor adds automatic make-up gain (≈0.6 × the gain reduction at 0 dBFS, ≈3.4 dB here);
// the trim takes it back so quiet program passes at unity and the limiter only touches peaks.
const TRIM = 0.67;
/** Animal bus make-up: one-shots are normalized to −20 LUFS and beds to −24; +4 dB puts a call 10 m away ≈6 dB over
 *  the daytime bed. Tuned with scripts/audio-probe.mjs. */
const VOICE_GAIN = 1.6;

interface ManifestClip extends ClipMeta { file: string; duration: number; bed?: string; near?: boolean; }
interface Clip { meta: ManifestClip | null; id: string; kind: CallKind | null; buffer: AudioBuffer | null; loading: boolean; }
interface Slot {
  active: boolean; token: number; filter: BiquadFilterNode; gain: GainNode; panner: PannerNode;
  src: AudioBufferSourceNode | null; env: GainNode | null;
  chimp: Chimp | null; chimpId: number; kind: CallKind; clip: string; x: number; y: number; z: number;
  priority: number; severity: number; selected: boolean; startedAt: number; distance: number;
}
interface Bed {
  name: BedName; els: HTMLAudioElement[]; xf: GainNode[]; level: GainNode; active: number;
  running: boolean; xfading: boolean; xfadeEnd: number; lastAudible: number; target: number;
}
export interface VoiceRecord { kind: CallKind; chimpId: number; clip: string; distance: number; priority: number; at: number; rate: number; }

export interface AudioEngine {
  status(): Status;
  settings(): SoundSettings;
  set(patch: Partial<SoundSettings>): void;
  toggleMute(): void;
  /** Creates/resumes the AudioContext; call from a user gesture. */
  unlock(): void;
  /** Fetches the manifest and decodes the one-shots (idempotent; call after the first frame). */
  load(): void;
  update(world: World, listener: ListenerPose | null, simRate: number, selectedId: number | null): void;
  snapshot(): Record<string, unknown>;
  dispose(): void;
}

type AnyAudioContext = typeof AudioContext;
const AC: AnyAudioContext | undefined = typeof window === 'undefined' ? undefined
  : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AnyAudioContext }).webkitAudioContext);
const OAC: typeof OfflineAudioContext | undefined = typeof window === 'undefined' ? undefined
  : (window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext);

const decode = (c: BaseAudioContext, data: ArrayBuffer) => new Promise<AudioBuffer>((resolve, reject) => {
  const p = c.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined; // Safari < 14.1 returns undefined
  p?.then(resolve, reject);
});
// Equal-power crossfade curves for the bed loop handover.
const FADE_IN = new Float32Array(33), FADE_OUT = new Float32Array(33);
for (let i = 0; i <= 32; i++) { FADE_IN[i] = Math.sin(i / 32 * Math.PI / 2); FADE_OUT[i] = Math.cos(i / 32 * Math.PI / 2); }

export function createAudioEngine(options: { base?: string; debug?: boolean } = {}): AudioEngine {
  const base = options.base ?? `${import.meta.env?.BASE_URL ?? '/'}audio/`;
  let settings: SoundSettings = loadSound();
  let ctx: AudioContext | null = null;
  let ranOnce = false;
  let manifest: ManifestClip[] | null = null;
  let loadStarted = false, disposed = false;
  const clips = new Map<string, Clip>();
  const pools = Object.fromEntries(CALL_KINDS.map(k => [k, [] as Clip[]])) as Record<CallKind, Clip[]>;
  const thunder: { near: Clip[]; far: Clip[] } = { near: [], far: [] };
  let decodedBytes = 0;

  // Graph nodes (built on unlock).
  let master!: GainNode, limiter!: DynamicsCompressorNode, trim!: GainNode;
  let animals!: GainNode, ambience!: GainNode, water!: GainNode, weather!: GainNode;
  let widthLL!: GainNode, widthRL!: GainNode, widthLR!: GainNode, widthRR!: GainNode;
  let waterPan!: StereoPannerNode, waterLp!: BiquadFilterNode;
  const slots: Slot[] = [];
  const slotPriority = new Float32Array(MAX_VOICES), slotActive = new Uint8Array(MAX_VOICES);
  const beds = new Map<BedName, Bed>();

  // Per-update state (no allocation in the loop).
  let lastUpdate = 0, lastWorld: World | null = null, lastCallId = -1, lastInteractionId = -1, lastLightning = -1;
  let simRate = 0, selected = -1, animalTarget = 0;
  let lx = 0, lz = 0, yaw = 0, zoom01 = 1, view: ListenerPose['view'] = 'rts';
  const LY = 2; // listener height; sources sit at 1 m + climbing height (terrain relief is ignored: flat frame)
  const levels = emptyLevels();
  const near = { x: 0, z: 0, d: Infinity };
  const bedInput = { hour: 12, daylight: 1, weather: 'clear' as World['environment']['weather'], rain: 0, zoom01: 1, streamDistance: Infinity, hoursPerSecond: 0 };
  const lastByKind: Partial<Record<CallKind, number>> = {};
  const lastByChimp = new Map<number, number>();
  let pendingThunderAt = 0, pendingThunderDelay = 0, lastThunderAt = -1e9, thunders = 0;
  const recent: VoiceRecord[] = [];
  const dropped = { zoom: 0, range: 0, rate: 0, cooldown: 0, busy: 0, cap: 0, noClip: 0, stale: 0 };
  let started = 0, stolen = 0, updateMs = 0, updateCount = 0;

  const realNow = () => performance.now() / 1000;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  function status(): Status {
    if (!AC) return 'unavailable';
    if (!ctx || (!ranOnce && ctx.state !== 'running')) return 'locked';
    return ctx.state === 'running' ? 'running' : 'suspended';
  }
  const wantRunning = () => !settings.muted && (typeof document === 'undefined' || !document.hidden);

  function onGesture(e: Event) {
    // The sound button and the S key handle their own gesture (toggle semantics), so skip them here.
    if (e instanceof KeyboardEvent && (e.key === 's' || e.key === 'S' || e.metaKey || e.ctrlKey || e.altKey)) return;
    if ((e.target as Element | null)?.closest?.('[data-sound-toggle]')) return;
    if (settings.muted) return; // muted from a previous visit: stay silent until the user turns sound on
    unlock();
  }
  if (typeof window !== 'undefined' && AC) {
    window.addEventListener('pointerdown', onGesture, true);
    window.addEventListener('keydown', onGesture, true);
    document.addEventListener('visibilitychange', applyRunState);
  }
  function removeGestureListeners() {
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
  }

  function unlock() {
    if (!AC || disposed) return;
    if (!ctx) { try { buildGraph(); } catch (error) { console.warn('Sound could not start:', error); return; } }
    // Elements must be started inside the gesture once (Safari); they pause again right away unless audible.
    for (const bed of beds.values()) for (const el of bed.els) {
      if (!el.paused || bed.running) continue;
      el.play()?.then(() => { if (!bed.running || (el !== bed.els[bed.active] && !bed.xfading)) el.pause(); }, () => {});
    }
    applyRunState();
  }

  function applyRunState() {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (wantRunning()) {
      if (ctx.state !== 'running') void ctx.resume().then(() => { ranOnce = true; removeGestureListeners(); resumeBeds(); }, () => {});
      else { ranOnce = true; removeGestureListeners(); resumeBeds(); }
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(settings.master, t, 0.08);
    } else if (ctx.state === 'running') {
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(0, t, 0.03);
      const c = ctx;
      setTimeout(() => { if (!wantRunning() && c.state === 'running') { pauseBeds(); void c.suspend(); } }, 150);
    }
  }

  function buildGraph() {
    const c = new AC!({ latencyHint: 'playback' });
    ctx = c;
    master = c.createGain(); master.gain.value = 0;
    limiter = c.createDynamicsCompressor();
    limiter.threshold.value = LIMITER.threshold; limiter.knee.value = LIMITER.knee; limiter.ratio.value = LIMITER.ratio;
    limiter.attack.value = LIMITER.attack; limiter.release.value = LIMITER.release;
    trim = c.createGain(); trim.gain.value = TRIM;
    master.connect(limiter).connect(trim).connect(c.destination);
    animals = c.createGain(); animals.gain.value = 0; animals.connect(master);
    weather = c.createGain(); weather.gain.value = settings.weather; weather.connect(master);
    water = c.createGain(); water.gain.value = settings.ambience; water.connect(master);
    // Ambience M/S width: L' = aL + bR, R' = bL + aR with a = (1+w)/2, b = (1-w)/2.
    ambience = c.createGain(); ambience.gain.value = settings.ambience;
    const split = c.createChannelSplitter(2), merge = c.createChannelMerger(2);
    widthLL = c.createGain(); widthRL = c.createGain(); widthLR = c.createGain(); widthRR = c.createGain();
    ambience.connect(split);
    split.connect(widthLL, 0); split.connect(widthLR, 0); split.connect(widthRL, 1); split.connect(widthRR, 1);
    widthLL.connect(merge, 0, 0); widthRL.connect(merge, 0, 0); widthLR.connect(merge, 0, 1); widthRR.connect(merge, 0, 1);
    merge.connect(master);
    setWidth(1, 0);
    waterPan = c.createStereoPanner(); waterLp = c.createBiquadFilter(); waterLp.type = 'lowpass'; waterLp.frequency.value = 16000;
    waterPan.connect(waterLp).connect(water);

    for (let i = 0; i < MAX_VOICES; i++) {
      const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 0.5; filter.frequency.value = 16000;
      const gain = c.createGain(); gain.gain.value = 0;
      const panner = c.createPanner();
      panner.panningModel = 'equalpower'; panner.distanceModel = 'inverse'; panner.refDistance = 1; panner.rolloffFactor = 0; // distance gain is ours (mix.ts)
      filter.connect(gain).connect(panner).connect(animals);
      slots.push({ active: false, token: 0, filter, gain, panner, src: null, env: null, chimp: null, chimpId: -1, kind: 'pant-hoot', clip: '', x: 0, y: 1, z: 0, priority: 0, severity: 1, selected: false, startedAt: 0, distance: 0 });
    }
    for (const name of BED_NAMES) beds.set(name, createBed(c, name));
    c.onstatechange = () => { if (c.state === 'running') ranOnce = true; };
  }

  function setWidth(w: number, t: number) {
    const a = (1 + w) / 2, b = (1 - w) / 2;
    widthLL.gain.setTargetAtTime(a, t, 0.3); widthRR.gain.setTargetAtTime(a, t, 0.3);
    widthRL.gain.setTargetAtTime(b, t, 0.3); widthLR.gain.setTargetAtTime(b, t, 0.3);
  }

  // ---------------------------------------------------------------------------
  // Beds: two streaming <audio> elements per bed, crossfaded at the loop point
  // ---------------------------------------------------------------------------
  function createBed(c: AudioContext, name: BedName): Bed {
    const level = c.createGain(); level.gain.value = 0;
    level.connect(name === 'stream' || name === 'burble' ? waterPan : name === 'rain' || name === 'storm' ? weather : ambience);
    const els: HTMLAudioElement[] = [], xf: GainNode[] = [];
    for (let i = 0; i < 2; i++) {
      const el = new Audio(`${base}bed/bed-${name}.m4a`);
      el.preload = 'auto'; el.loop = false;
      const g = c.createGain(); g.gain.value = i === 0 ? 1 : 0;
      c.createMediaElementSource(el).connect(g).connect(level);
      els.push(el); xf.push(g);
    }
    const bed: Bed = { name, els, xf, level, active: 0, running: false, xfading: false, xfadeEnd: 0, lastAudible: -1e9, target: 0 };
    // Fallback if a handover was missed (a long main-thread stall): restart the ended element.
    for (const el of els) el.addEventListener('ended', () => { if (bed.running && el === bed.els[bed.active] && !bed.xfading) { el.currentTime = 0; void el.play().catch(() => {}); } });
    return bed;
  }
  function bedDuration(bed: Bed, el: HTMLAudioElement): number {
    return Number.isFinite(el.duration) && el.duration > 0 ? el.duration : clips.get(`bed-${bed.name}`)?.meta?.duration ?? 60;
  }
  function startBed(bed: Bed) {
    const el = bed.els[0];
    bed.active = 0; bed.running = true; bed.xfading = false;
    const t = ctx!.currentTime;
    bed.xf[0].gain.cancelScheduledValues(t); bed.xf[0].gain.setValueAtTime(1, t);
    bed.xf[1].gain.cancelScheduledValues(t); bed.xf[1].gain.setValueAtTime(0, t);
    const dur = bedDuration(bed, el);
    // Random entry point so the same few seconds do not always greet the listener.
    try { el.currentTime = Math.random() * Math.max(0, dur - 2 * BED_XF - 1); } catch { /* metadata not loaded yet: starts at 0 */ }
    void el.play().catch(() => {});
  }
  function stopBed(bed: Bed) { bed.running = false; bed.xfading = false; for (const el of bed.els) el.pause(); }
  function pauseBeds() { for (const bed of beds.values()) for (const el of bed.els) el.pause(); }
  function resumeBeds() {
    for (const bed of beds.values()) {
      if (!bed.running) continue;
      void bed.els[bed.active].play().catch(() => {});
      if (bed.xfading) void bed.els[1 - bed.active].play().catch(() => {});
    }
  }
  function loopBed(bed: Bed, t: number) {
    const a = bed.els[bed.active], b = bed.els[1 - bed.active];
    if (bed.xfading) {
      if (t >= bed.xfadeEnd) { a.pause(); bed.active = 1 - bed.active; bed.xfading = false; }
      return;
    }
    const dur = bedDuration(bed, a);
    if (a.currentTime < dur - BED_XF - 0.2) return;
    try { b.currentTime = 0; } catch { /* not seekable yet */ }
    void b.play().catch(() => {});
    const ga = bed.xf[bed.active].gain, gb = bed.xf[1 - bed.active].gain;
    ga.cancelScheduledValues(t); gb.cancelScheduledValues(t);
    ga.setValueCurveAtTime(FADE_OUT, t, BED_XF); gb.setValueCurveAtTime(FADE_IN, t, BED_XF);
    bed.xfading = true; bed.xfadeEnd = t + BED_XF + 0.05;
  }

  // ---------------------------------------------------------------------------
  // Assets
  // ---------------------------------------------------------------------------
  function load() {
    if (loadStarted || !AC || !OAC) return;
    loadStarted = true;
    void (async () => {
      try {
        const res = await fetch(`${base}manifest.json`);
        if (!res.ok) throw new Error(`manifest ${res.status}`);
        manifest = ((await res.json()) as { clips: ManifestClip[] }).clips;
      } catch (error) { console.warn('Sound assets unavailable (run node scripts/build-audio.mjs):', error); return; }
      for (const m of manifest) clips.set(m.id, { meta: m, id: m.id, kind: m.kind ?? null, buffer: null, loading: false });
      buildSynth();
      rebuildPools();
      // Decode in order of salience, two at a time: long calls and screams first, then thunder and the rest.
      const order: CallKind[] = ['pant-hoot', 'scream', 'bark', 'pant-grunt', 'alarm-hoo', 'food-grunt', 'whimper'];
      const queue = [...order.flatMap(k => pools[k]), ...manifest.filter(m => m.role === 'thunder').map(m => clips.get(m.id)!)];
      await decodeAll(queue);
    })();
  }
  let voiceCtx: OfflineAudioContext | null = null, thunderCtx: OfflineAudioContext | null = null;
  async function decodeAll(queue: Clip[]) {
    // Offline contexts decode without a user gesture, and resample to their rate (memory: 32/24 kHz instead of 48).
    voiceCtx ??= new OAC!(1, 1, VOICE_RATE); thunderCtx ??= new OAC!(1, 1, THUNDER_RATE);
    let next = 0;
    const worker = async () => {
      while (next < queue.length && !disposed) {
        const clip = queue[next++];
        if (clip.buffer || clip.loading || !clip.meta) continue;
        clip.loading = true;
        try {
          const data = await (await fetch(`${base}${clip.meta.file}`)).arrayBuffer();
          clip.buffer = await decode(clip.meta.role === 'thunder' ? thunderCtx! : voiceCtx!, data);
          decodedBytes += clip.buffer.length * clip.buffer.numberOfChannels * 4;
        } catch (error) { console.warn(`Sound clip ${clip.id} failed to load`, error); }
        clip.loading = false;
      }
    };
    await Promise.all([worker(), worker()]);
  }
  function buildSynth() {
    const off = new OAC!(1, 1, VOICE_RATE);
    const make = (id: string, kind: CallKind, data: Float32Array) => {
      const buffer = off.createBuffer(1, data.length, VOICE_RATE);
      buffer.getChannelData(0).set(data);
      decodedBytes += data.length * 4;
      clips.set(id, { meta: null, id, kind, buffer, loading: false });
    };
    for (let i = 0; i < 3; i++) { make(`drum-${i}`, 'drum', synthDrum(VOICE_RATE, 101 + i)); make(`laugh-${i}`, 'laugh', synthLaugh(VOICE_RATE, 201 + i)); }
  }
  function rebuildPools() {
    if (!manifest) return;
    const metas = manifest;
    for (const kind of CALL_KINDS) {
      pools[kind].length = 0;
      if (SYNTH_KINDS.includes(kind)) { for (const c of clips.values()) if (!c.meta && c.kind === kind) pools[kind].push(c); continue; }
      for (const id of poolFor(metas, kind, settings.bonobo)) pools[kind].push(clips.get(id)!);
    }
    thunder.near = metas.filter(m => m.role === 'thunder' && m.near).map(m => clips.get(m.id)!);
    thunder.far = metas.filter(m => m.role === 'thunder' && !m.near).map(m => clips.get(m.id)!);
    // Bonobo clips load only when enabled and are dropped again when disabled.
    const optional = metas.filter(m => m.optional).map(m => clips.get(m.id)!);
    if (settings.bonobo) void decodeAll(optional);
    else for (const c of optional) if (c.buffer) { decodedBytes -= c.buffer.length * 4; c.buffer = null; }
  }
  function pick(pool: Clip[]): Clip | null {
    if (!pool.length) return null;
    for (let tries = 0; tries < 6; tries++) { const c = pool[Math.floor(Math.random() * pool.length)]; if (c.buffer) return c; }
    for (const c of pool) if (c.buffer) return c;
    return null;
  }

  // ---------------------------------------------------------------------------
  // Voices
  // ---------------------------------------------------------------------------
  const dist = (x: number, y: number, z: number) => Math.sqrt((x - lx) ** 2 + (y - LY) ** 2 + (z - lz) ** 2);
  function findChimp(world: World, id: number): Chimp | null {
    const list = world.chimps;
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function chimpVoiceActive(id: number): boolean {
    for (const s of slots) if (s.active && s.chimpId === id && s.kind !== 'drum') return true;
    return false;
  }
  function setPos(p: PannerNode, x: number, y: number, z: number, t: number, glide: boolean) {
    if (p.positionX) {
      if (glide) { p.positionX.setTargetAtTime(x, t, 0.05); p.positionY.setTargetAtTime(y, t, 0.05); p.positionZ.setTargetAtTime(z, t, 0.05); }
      else { p.positionX.cancelScheduledValues(t); p.positionX.setValueAtTime(x, t); p.positionY.cancelScheduledValues(t); p.positionY.setValueAtTime(y, t); p.positionZ.cancelScheduledValues(t); p.positionZ.setValueAtTime(z, t); }
    } else p.setPosition(x, y, z);
  }

  function request(kind: CallKind, chimp: Chimp | null, chimpId: number, x: number, y: number, z: number, severity: number) {
    if (animalTarget < 0.01) { dropped.zoom++; return; }
    const d = dist(x, y, z);
    if (d > KIND[kind].range) { dropped.range++; return; }
    if (!admitAtRate(kind, simRate, d, Math.random())) { dropped.rate++; return; }
    const now = realNow();
    if (!cooldownOk(now, kind, chimpId, lastByKind, lastByChimp)) { dropped.cooldown++; return; }
    if (kind !== 'drum' && chimpId >= 0 && chimpVoiceActive(chimpId)) { dropped.busy++; return; }
    const clip = forcedClip ?? pick(pools[kind]);
    if (!clip?.buffer) { dropped.noClip++; return; }
    const isSelected = chimpId === selected;
    const priority = voicePriority(kind, d, isSelected, severity);
    for (let i = 0; i < slots.length; i++) { slotPriority[i] = slots[i].priority; slotActive[i] = slots[i].active ? 1 : 0; }
    const si = pickSlot(priority, slotPriority, slotActive);
    if (si < 0) { dropped.cap++; return; }
    const c = ctx!, t = c.currentTime, slot = slots[si];
    if (slot.active) { stopSlot(slot, t); stolen++; }
    const rate = chimp ? voiceRate(chimp.id, chimp.sex, chimp.stage) : 1;
    const src = c.createBufferSource(), env = c.createGain();
    src.buffer = clip.buffer; src.playbackRate.value = rate;
    const at = t + 0.01 + Math.random() * 0.1; // small jitter so simultaneous calls do not start in lockstep
    env.gain.setValueAtTime(0, t); env.gain.setValueAtTime(0, at); env.gain.linearRampToValueAtTime(1, at + 0.012);
    src.connect(env).connect(slot.filter);
    const token = ++slot.token;
    src.onended = () => { env.disconnect(); if (slot.token === token) { slot.active = false; slot.src = null; slot.env = null; slot.chimp = null; } };
    Object.assign(slot, { active: true, src, env, chimp, chimpId, kind, clip: clip.id, x, y, z, priority, severity, selected: isSelected, startedAt: now, distance: d });
    const g = KIND[kind].level * distanceGain(d, kind);
    slot.gain.gain.cancelScheduledValues(t); slot.gain.gain.setValueAtTime(g, t);
    slot.filter.frequency.cancelScheduledValues(t); slot.filter.frequency.setValueAtTime(absorptionCutoff(d), t);
    setPos(slot.panner, x, y, z, t, false);
    src.start(at);
    lastByKind[kind] = now;
    if (chimpId >= 0) lastByChimp.set(chimpId, now);
    started++;
    recent.push({ kind, chimpId, clip: clip.id, distance: Math.round(d * 10) / 10, priority: Math.round(priority * 1000) / 1000, at: Math.round(now * 100) / 100, rate: Math.round(rate * 1000) / 1000 });
    if (recent.length > 12) recent.shift();
  }
  function stopSlot(slot: Slot, t: number) {
    slot.token++;
    if (slot.env) { slot.env.gain.cancelScheduledValues(t); slot.env.gain.setTargetAtTime(0, t, 0.015); }
    try { slot.src?.stop(t + 0.1); } catch { /* already stopped */ }
    slot.active = false; slot.src = null; slot.env = null; slot.chimp = null;
  }
  function stopAllVoices() { if (!ctx) return; const t = ctx.currentTime; for (const s of slots) if (s.active) stopSlot(s, t); }

  function updateVoices(t: number) {
    for (const s of slots) {
      if (!s.active) continue;
      const c = s.chimp;
      if (c && c.alive) { s.x = c.position[0]; s.z = c.position[2]; s.y = 1 + Math.max(0, c.position[1]); }
      const d = dist(s.x, s.y, s.z);
      s.distance = d;
      s.selected = s.chimpId === selected;
      s.priority = voicePriority(s.kind, d, s.selected, s.severity);
      s.gain.gain.setTargetAtTime(KIND[s.kind].level * distanceGain(d, s.kind), t, 0.08);
      s.filter.frequency.setTargetAtTime(absorptionCutoff(d), t, 0.08);
      setPos(s.panner, s.x, s.y, s.z, t, true);
    }
  }

  // ---------------------------------------------------------------------------
  // Events: new calls and salient interactions since the last update
  // ---------------------------------------------------------------------------
  function scanEvents(world: World, live: boolean) {
    // Calls older than about a real second of playback are stale (a burst from skipped time, a tab coming back).
    const staleHours = Math.max(30, simRate * 1.2) / 3600;
    const calls = world.calls;
    let i = calls.length - 1;
    while (i >= 0 && calls[i].id > lastCallId) i--;
    for (let k = i + 1; k < calls.length; k++) {
      const call = calls[k];
      if (!live) continue;
      if (world.time - call.time > staleHours) { dropped.stale++; continue; }
      // The sound comes from where the call was made (a playback speaker is not its attributed caller); the voice then
      // follows the caller only if the caller is actually there.
      const found = findChimp(world, call.callerId), p = call.position;
      const chimp = found?.alive && hyp2(found.position[0] - p[0], found.position[2] - p[2]) < 4 ? found : null;
      request(call.kind, chimp, call.callerId, p[0], 1 + Math.max(0, p[1]), p[2], 1);
    }
    if (calls.length) lastCallId = Math.max(lastCallId, calls[calls.length - 1].id);
    const list = world.interactions;
    i = list.length - 1;
    while (i >= 0 && list[i].id > lastInteractionId) i--;
    for (let k = i + 1; k < list.length; k++) {
      const it = list[k];
      const voices = INTERACTION_VOICES[it.kind];
      if (!live || !voices) continue;
      if (world.time - it.start > staleHours) { dropped.stale++; continue; }
      for (const v of voices) {
        const id = v.who === 'actor' ? it.actorId : it.targetId;
        if (id < 0) continue;
        const chimp = findChimp(world, id);
        if (!chimp || !chimp.alive) continue;
        request(v.kind, chimp, id, chimp.position[0], 1 + Math.max(0, chimp.position[1]), chimp.position[2], v.severity);
      }
    }
    if (list.length) lastInteractionId = Math.max(lastInteractionId, list[list.length - 1].id);
  }

  function attachWorld(world: World) {
    lastWorld = world;
    stopAllVoices();
    lastCallId = world.calls.length ? world.calls[world.calls.length - 1].id : -1;
    lastInteractionId = world.interactions.length ? world.interactions[world.interactions.length - 1].id : -1;
    lastLightning = world.environment.lightningAt;
    lastByChimp.clear();
    pendingThunderAt = 0;
  }

  // ---------------------------------------------------------------------------
  // Thunder
  // ---------------------------------------------------------------------------
  function playThunder(delay: number) {
    const shape = thunderShape(delay);
    const clip = pick(shape.near ? thunder.near : thunder.far) ?? pick(thunder.near) ?? pick(thunder.far);
    if (!clip?.buffer || !ctx) return;
    const c = ctx, t = c.currentTime;
    const src = c.createBufferSource(), g = c.createGain(), pan = c.createStereoPanner(), lp = c.createBiquadFilter();
    src.buffer = clip.buffer; src.playbackRate.value = 0.94 + Math.random() * 0.12;
    g.gain.value = shape.gain; pan.pan.value = Math.random() * 1.2 - 0.6; lp.type = 'lowpass'; lp.frequency.value = shape.cutoff;
    src.connect(lp).connect(g).connect(pan).connect(weather);
    src.onended = () => pan.disconnect();
    src.start(t);
    thunders++;
    lastThunderAt = realNow();
  }

  // ---------------------------------------------------------------------------
  // Frame update (throttled to 20 Hz)
  // ---------------------------------------------------------------------------
  function update(world: World, listener: ListenerPose | null, rate: number, selectedId: number | null) {
    const now = realNow();
    if (now - lastUpdate < UPDATE_SECONDS) return;
    const t0 = performance.now();
    lastUpdate = now;
    if (world !== lastWorld) attachWorld(world);
    simRate = rate; selected = selectedId ?? -1;
    if (listener) { lx = listener.x; lz = listener.z; yaw = listener.yaw; zoom01 = listener.zoom01; view = listener.view; }
    else { zoom01 = 1; view = 'rts'; }
    animalTarget = settings.animals * animalZoomGain(view, zoom01);
    const animalGain = animalTarget * VOICE_GAIN;
    const running = !!ctx && ctx.state === 'running';
    const live = running && !!listener && rateTier(simRate) !== 'paused';
    scanEvents(world, live);
    const env = world.environment;
    if (env.lightningAt !== lastLightning) {
      if (env.lightningAt > lastLightning && running && simRate > 0 && !pendingThunderAt && now - lastThunderAt > THUNDER_COOLDOWN) {
        pendingThunderDelay = 1 + Math.random() * 5; // flash-to-bang delay: 1–6 s
        pendingThunderAt = now + pendingThunderDelay;
      }
      lastLightning = env.lightningAt;
    }
    if (running) {
      if (pendingThunderAt && now >= pendingThunderAt) { pendingThunderAt = 0; playThunder(pendingThunderDelay); }
      const c = ctx!, t = c.currentTime;
      updateListener(c, t);
      nearestOnStream(world.stream, lx, lz, near);
      bedInput.hour = world.hour; bedInput.daylight = env.daylight; bedInput.weather = env.weather; bedInput.rain = env.rain;
      bedInput.zoom01 = zoom01; bedInput.streamDistance = near.d; bedInput.hoursPerSecond = simRate / 3600;
      bedLevels(bedInput, levels);
      for (const bed of beds.values()) {
        const target = levels[bed.name];
        bed.target = target;
        bed.level.gain.setTargetAtTime(target * BED_TRIM[bed.name], t, BED_TAU[bed.name]);
        if (target > 0.005) bed.lastAudible = now;
        if (target > 0.005 && !bed.running) startBed(bed);
        else if (bed.running && now - bed.lastAudible > 8) stopBed(bed);
        if (bed.running) loopBed(bed, t);
      }
      if (Number.isFinite(near.d)) {
        waterPan.pan.setTargetAtTime(streamPan(headingOf(near.x - lx, near.z - lz) - yaw, near.d), t, 0.15);
        waterLp.frequency.setTargetAtTime(streamCutoff(near.d), t, 0.15);
      }
      animals.gain.setTargetAtTime(animalGain, t, 0.25);
      ambience.gain.setTargetAtTime(settings.ambience * ambienceZoomGain(zoom01), t, 0.4);
      water.gain.setTargetAtTime(settings.ambience, t, 0.2);
      weather.gain.setTargetAtTime(settings.weather, t, 0.2);
      setWidth(ambienceWidth(zoom01), t);
      updateVoices(t);
    }
    updateMs += performance.now() - t0; updateCount++;
  }
  function updateListener(c: AudioContext, t: number) {
    const L = c.listener, fx = Math.sin(yaw), fz = -Math.cos(yaw);
    if (L.positionX) {
      L.positionX.setTargetAtTime(lx, t, 0.05); L.positionY.setTargetAtTime(LY, t, 0.05); L.positionZ.setTargetAtTime(lz, t, 0.05);
      L.forwardX.setTargetAtTime(fx, t, 0.05); L.forwardY.setTargetAtTime(0, t, 0.05); L.forwardZ.setTargetAtTime(fz, t, 0.05);
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(lx, LY, lz); L.setOrientation(fx, 0, fz, 0, 1, 0); }
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  function set(patch: Partial<SoundSettings>) {
    const before = settings;
    settings = { ...settings, ...patch };
    saveSound(settings);
    if (before.bonobo !== settings.bonobo) rebuildPools();
    if (before.muted !== settings.muted) applyRunState();
    if (ctx && ctx.state === 'running' && !settings.muted) master.gain.setTargetAtTime(settings.master, ctx.currentTime, 0.08);
  }
  function toggleMute() {
    if (status() === 'locked') { settings = { ...settings, muted: false }; saveSound(settings); unlock(); return; }
    set({ muted: !settings.muted });
  }

  function snapshot() {
    const active = slots.filter(s => s.active);
    const bedState: Record<string, unknown> = {};
    for (const bed of beds.values()) bedState[bed.name] = { target: Math.round(bed.target * 1000) / 1000, gain: Math.round(bed.level.gain.value * 1000) / 1000, running: bed.running, xfading: bed.xfading, time: Math.round(bed.els[bed.active].currentTime * 10) / 10 };
    return {
      status: status(), muted: settings.muted, settings: { ...settings }, contextState: ctx?.state ?? null, sampleRate: ctx?.sampleRate ?? null,
      loaded: { manifest: !!manifest, decoded: [...clips.values()].filter(c => c.buffer).length, expected: [...clips.values()].filter(c => !c.meta || (c.meta.role !== 'bed' && (!c.meta.optional || settings.bonobo))).length },
      decodedMB: Math.round(decodedBytes / 1e5) / 10,
      activeVoices: active.length, voices: active.map(s => ({ kind: s.kind, chimpId: s.chimpId, clip: s.clip, distance: Math.round(s.distance * 10) / 10, priority: Math.round(s.priority * 1000) / 1000 })),
      beds: bedState, buses: ctx ? { animals: round3(animals.gain.value), animalTarget: round3(animalTarget), ambience: round3(ambience.gain.value), water: round3(water.gain.value), weather: round3(weather.gain.value), master: round3(master.gain.value), limiterReductionDb: round3(limiter.reduction) } : null,
      listener: { x: Math.round(lx * 10) / 10, z: Math.round(lz * 10) / 10, yaw: round3(yaw), zoom01: round3(zoom01), view, streamDistance: Math.round(near.d * 10) / 10 },
      rateTier: rateTier(simRate), started, stolen, dropped: { ...dropped }, thunders, lastVoices: recent.slice(-8),
      updateMsAvg: updateCount ? Math.round(updateMs / updateCount * 1000) / 1000 : 0,
    };
  }
  const round3 = (x: number) => Math.round(x * 1000) / 1000;

  // ---------------------------------------------------------------------------
  // Debug hook (?audiodebug=1): lossless capture of the master output, bed loop tests
  // ---------------------------------------------------------------------------
  let recorderReady: Promise<void> | null = null;
  let forcedClip: Clip | null = null;
  function installDebug() {
    const need = () => { if (!ctx) unlock(); if (!ctx) throw new Error('no AudioContext'); return ctx; };
    (window as unknown as { __MGOGO_AUDIO__: object }).__MGOGO_AUDIO__ = {
      snapshot, set, unlock,
      /** Records the post-limiter output for `seconds` as a 32-bit float stereo WAV (base64). Lossless, so true peak is measurable. */
      async record(seconds: number): Promise<{ wav: string; peak: number }> {
        const c = need();
        if (!recorderReady) {
          const code = `registerProcessor('mgogo-tap', class extends AudioWorkletProcessor { process(inputs) { const i = inputs[0]; if (i && i.length) this.port.postMessage([i[0].slice(), (i[1] || i[0]).slice()]); return true; } });`;
          recorderReady = c.audioWorklet.addModule(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })));
        }
        await recorderReady;
        return new Promise(resolve => {
          const frames = Math.round(seconds * c.sampleRate), L = new Float32Array(frames), R = new Float32Array(frames);
          let n = 0, peak = 0;
          const tap = new AudioWorkletNode(c, 'mgogo-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit' });
          const sink = c.createGain(); sink.gain.value = 0;
          tap.port.onmessage = (e: MessageEvent<[Float32Array, Float32Array]>) => {
            const [a, b] = e.data;
            for (let i = 0; i < a.length && n < frames; i++, n++) { L[n] = a[i]; R[n] = b[i]; peak = Math.max(peak, Math.abs(a[i]), Math.abs(b[i])); }
            if (n >= frames && tap.port.onmessage) { tap.port.onmessage = null; trim.disconnect(tap); tap.disconnect(); resolve({ wav: floatWav(L, R, c.sampleRate), peak }); }
          };
          trim.connect(tap); tap.connect(sink).connect(c.destination);
        });
      },
      /** Plays one clip `dx, dz` metres from the listener through the normal voice path (zoom fade, distance, panning),
       *  bypassing cooldowns and the speed gate, so views can be compared with identical input. */
      probeVoice(kind: CallKind, clipId: string, dx: number, dz: number) {
        const clip = clips.get(clipId);
        if (!clip?.buffer) return false;
        const saved = simRate; simRate = 60; forcedClip = clip; delete lastByKind[kind];
        const before = started;
        request(kind, null, -1, lx + dx, 1, lz + dz, 1);
        forcedClip = null; simRate = saved;
        return started > before;
      },
      /** Moves every running bed to `seconds` before its loop point, to test the handover. */
      seekBeds(seconds: number) { for (const bed of beds.values()) if (bed.running && !bed.xfading) { const el = bed.els[bed.active]; el.currentTime = Math.max(0, bedDuration(bed, el) - seconds); } return [...beds.values()].filter(b => b.running).map(b => b.name); },
    };
  }

  if (options.debug && typeof window !== 'undefined') installDebug();

  function dispose() {
    disposed = true;
    if (typeof window !== 'undefined') { removeGestureListeners(); document.removeEventListener('visibilitychange', applyRunState); }
    stopAllVoices(); pauseBeds();
    void ctx?.close();
  }

  return { status, settings: () => ({ ...settings }), set, toggleMute, unlock, load, update, snapshot, dispose };
}

/** 32-bit float stereo WAV, base64 (debug capture). */
function floatWav(L: Float32Array, R: Float32Array, sampleRate: number): string {
  const n = L.length, bytes = new Uint8Array(44 + n * 8), v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 8, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, 2, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 8, true); v.setUint16(32, 8, true); v.setUint16(34, 32, true); str(36, 'data'); v.setUint32(40, n * 8, true);
  for (let i = 0; i < n; i++) { v.setFloat32(44 + i * 8, L[i], true); v.setFloat32(48 + i * 8, R[i], true); }
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
