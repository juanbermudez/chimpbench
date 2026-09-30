// Forest sound for docs/architecture.html: the app's rainforest ambience, and now and then a chimpanzee calling from
// somewhere in the forest. Reuses the app's derived audio (public/audio, Epidemic Sound, licensed to the user; see
// public/audio/SOURCES.md), so it only plays when the guide is served from this project.
//
// - Autoplay policy: nothing plays at load. Sound starts on the first click or key anywhere, or from the header's
//   Sound button. Every start (first gesture, unmute, return to the tab) fades in over 3 s on a raised-cosine curve
//   (slow start, gentle landing); turning it off fades out in 0.4 s. The on/off choice is remembered for the next
//   visit. There is no volume control: the level is set once, under the page.
// - Memory: the ambience bed streams through two <audio> elements crossfaded at the loop point (never decoded into an
//   AudioBuffer). The manifest and each call clip are fetched lazily, on first start and on first use.
// - Calls: chimpanzee pools only (pant-hoots, alarm hoos, screams, synthesized buttress drums); never the optional
//   bonobo clips. One call every 45–90 s at a random distance: near (rare), mid or far. Distance sets the gain, a
//   low-pass cutoff (far is duller), a reverb send and a random pan. A limiter guards the output.
// - Hidden tab: everything pauses and resumes on return.
// - `?sounddebug=1` shortens the interval to 3–6 s and exposes `window.__GUIDE_SOUND__` for headless checks.

import { synthDrum } from '../../src/audio/synth.ts';

const KEY = 'chimpbench.guide.sound';
const DEBUG = /[?&]sounddebug=1\b/.test(location.search);
const BASE = new URL('../audio/', location.href).href;
const AMBIENCE = 'bed-dawn';                           // the app's daytime rainforest bed
const BED_GAIN = 0.42, BED_XF = 4;                     // under the page, never in front of it; s of loop crossfade
const FADE_IN = 3, FADE_OUT = 0.4, FADE_HIDE = 0.25;
const GAP = DEBUG ? [3, 6] : [45, 90];                 // s between calls
const KINDS = [['pant-hoot', 0.5], ['drum', 0.2], ['scream', 0.15], ['alarm-hoo', 0.15]];   // weights; design assumption
// Distance classes: share of calls, gain, low-pass cutoff (Hz), reverb send, pan spread. Far calls are dull and wet.
const DIST = [
  { name: 'near', p: 0.12, gain: 0.34, cutoff: 12000, send: 0.08, pan: 0.55 },
  { name: 'mid', p: 0.48, gain: 0.16, cutoff: 4200, send: 0.2, pan: 0.8 },
  { name: 'far', p: 0.4, gain: 0.085, cutoff: 1500, send: 0.34, pan: 0.95 },
];

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = v => { try { localStorage.setItem(KEY, v); } catch { /* storage blocked: the choice lasts this visit */ } };
try { localStorage.removeItem('chimpbench.guide.volume'); } catch { /* a volume stored by an earlier version of the page */ }
const AC = window.AudioContext || window.webkitAudioContext;
const pick = list => list[Math.floor(Math.random() * list.length)];

function guideSound() {
  const toggle = document.querySelector('[data-sound-toggle]');
  if (!toggle || !AC) return;   // no Web Audio: the button stays hidden
  let muted = read() === 'off', started = false, ctx = null, out = null, mix = null, reverb = null, clips = null, timer = 0;
  const bed = { els: [], xf: [], active: 0, xfading: false, xfadeEnd: 0 };
  const buffers = new Map();
  const state = { state: 'idle', muted, calls: 0, last: null, errors: 0 };
  if (DEBUG) window.__GUIDE_SOUND__ = state;

  const paint = () => {
    const on = started && !muted;
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    toggle.querySelector('.snd-long').textContent = on ? 'Sound on' : 'Sound off';
    toggle.querySelector('.snd-short').textContent = on ? 'On' : 'Off';
    toggle.querySelector('use').setAttribute('href', on ? '#i-speaker' : '#i-speaker-off');
    state.muted = muted;
  };

  function build() {
    ctx = new AC();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6; limiter.knee.value = 3; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.25;
    out = ctx.createGain(); out.gain.value = 0;              // fades (start, mute, hidden tab)
    const trim = ctx.createGain(); trim.gain.value = 0.67;   // takes back the compressor's automatic make-up gain (as in the app)
    mix = ctx.createGain();
    mix.connect(limiter).connect(trim).connect(out).connect(ctx.destination);
    // A short synthetic room (decaying stereo noise) for the distance send.
    reverb = ctx.createConvolver();
    const n = Math.floor(ctx.sampleRate * 1.8), ir = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    reverb.connect(wet).connect(mix);
    const bedLevel = ctx.createGain(); bedLevel.gain.value = BED_GAIN; bedLevel.connect(mix);
    for (let i = 0; i < 2; i++) {
      const el = new Audio(BASE + `bed/${AMBIENCE}.m4a`);
      el.preload = 'auto'; el.loop = false;
      const g = ctx.createGain(); g.gain.value = i ? 0 : 1;
      ctx.createMediaElementSource(el).connect(g).connect(bedLevel);
      el.addEventListener('ended', () => { if (el === bed.els[bed.active] && !bed.xfading && !muted && !document.hidden) { el.currentTime = 0; el.play().catch(() => {}); } });
      bed.els.push(el); bed.xf.push(g);
    }
  }

  // Equal-power handover at the loop point, checked four times a second.
  const UP = new Float32Array(33), DOWN = new Float32Array(33);
  for (let i = 0; i <= 32; i++) { UP[i] = Math.sin(i / 32 * Math.PI / 2); DOWN[i] = Math.cos(i / 32 * Math.PI / 2); }
  function loopBed() {
    const t = ctx.currentTime, a = bed.els[bed.active], b = bed.els[1 - bed.active];
    if (bed.xfading) { if (t >= bed.xfadeEnd) { a.pause(); bed.active = 1 - bed.active; bed.xfading = false; } return; }
    const dur = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 76;
    if (a.currentTime < dur - BED_XF - 0.2) return;
    try { b.currentTime = 0; } catch { /* not seekable yet */ }
    b.play().catch(() => {});
    const ga = bed.xf[bed.active].gain, gb = bed.xf[1 - bed.active].gain;
    ga.cancelScheduledValues(t); gb.cancelScheduledValues(t);
    ga.setValueCurveAtTime(DOWN, t, BED_XF); gb.setValueCurveAtTime(UP, t, BED_XF);
    bed.xfading = true; bed.xfadeEnd = t + BED_XF + 0.05;
  }
  const playBeds = () => { bed.els[bed.active].play().catch(() => {}); if (bed.xfading) bed.els[1 - bed.active].play().catch(() => {}); };
  const pauseBeds = () => bed.els.forEach(el => el.pause());

  // Raised-cosine fade from wherever the level is now: no jump if a fade is interrupted, a slow start, a soft landing.
  const fade = (to, secs) => {
    const g = out.gain, t = ctx.currentTime;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
    const from = g.value, curve = new Float32Array(64);
    for (let i = 0; i < 64; i++) curve[i] = from + (to - from) * (1 - Math.cos(Math.PI * i / 63)) / 2;
    g.setValueCurveAtTime(curve, t + 0.01, secs);
  };

  async function manifest() {
    if (clips) return clips;
    const res = await fetch(BASE + 'manifest.json');
    if (!res.ok) throw new Error('manifest ' + res.status);
    const all = (await res.json()).clips;
    // Chimpanzee pools only; the bonobo clips are optional and never enter them.
    clips = {};
    for (const [kind] of KINDS) clips[kind] = all.filter(c => c.role === 'voice' && c.kind === kind && c.species === 'chimpanzee' && !c.optional);
    return clips;
  }
  async function buffer(clip) {
    if (!buffers.has(clip.id)) {
      buffers.set(clip.id, fetch(BASE + clip.file).then(r => { if (!r.ok) throw new Error(clip.file + ' ' + r.status); return r.arrayBuffer(); }).then(d => ctx.decodeAudioData(d)));
    }
    return buffers.get(clip.id);
  }
  function drum() {
    const data = synthDrum(ctx.sampleRate, Math.floor(Math.random() * 2 ** 31));
    const b = ctx.createBuffer(1, data.length, ctx.sampleRate); b.copyToChannel(data, 0);
    return b;
  }

  async function call() {
    timer = 0;
    if (muted || document.hidden || !ctx) return;
    try {
      const r = Math.random() * KINDS.reduce((s, k) => s + k[1], 0);
      let kind = KINDS[0][0];
      for (let acc = 0, i = 0; i < KINDS.length; i++) { acc += KINDS[i][1]; if (r < acc) { kind = KINDS[i][0]; break; } }
      const pools = await manifest();
      let buf;
      if (kind === 'drum') buf = drum();
      else { if (!pools[kind].length) kind = 'pant-hoot'; buf = await buffer(pick(pools[kind])); }
      let u = Math.random(), d = DIST[DIST.length - 1];
      for (const x of DIST) { if (u < x.p) { d = x; break; } u -= x.p; }
      const t = ctx.currentTime + 0.05, jitter = 0.85 + Math.random() * 0.3;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = d.cutoff; lp.Q.value = 0.5;
      const g = ctx.createGain(); g.gain.value = d.gain * jitter * (kind === 'drum' ? 0.8 : 1);
      const pan = ctx.createStereoPanner(); pan.pan.value = (Math.random() * 2 - 1) * d.pan;
      const send = ctx.createGain(); send.gain.value = d.send;
      src.connect(lp).connect(g).connect(pan).connect(mix);
      g.connect(send).connect(reverb);
      src.start(t);
      state.calls++; state.last = { kind, distance: d.name, gain: +g.gain.value.toFixed(3), cutoff: d.cutoff, pan: +pan.pan.value.toFixed(2), at: Math.round(performance.now()) };
    } catch (e) { state.errors++; if (DEBUG) console.warn('guide sound: call skipped', e); }
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (muted || document.hidden || !started) return;
    timer = setTimeout(call, (GAP[0] + Math.random() * (GAP[1] - GAP[0])) * 1000);
  }

  function start(fadeSecs) {
    if (!ctx) build();
    const first = !started;
    started = true;
    ctx.resume().catch(() => {});
    if (first) {
      const a = bed.els[0];
      const seek = () => { try { a.currentTime = Math.random() * Math.max(0, a.duration - 2 * BED_XF - 1); } catch { /* starts at 0 */ } };
      if (a.readyState >= 1) seek(); else a.addEventListener('loadedmetadata', seek, { once: true });
      setInterval(() => {
        if (!muted && !document.hidden) loopBed();
        if (DEBUG) { const el = bed.els[bed.active]; Object.assign(state, { ctx: ctx.state, bedPaused: el.paused, bedTime: +el.currentTime.toFixed(2), level: +out.gain.value.toFixed(3) }); }
      }, 250);
      manifest().catch(() => { state.errors++; });
    }
    playBeds();
    fade(1, fadeSecs);
    state.state = 'running';
    schedule(); paint();
  }
  function silence(secs, thenSuspend) {
    clearTimeout(timer); timer = 0;
    if (!ctx) return;
    fade(0, secs);
    setTimeout(() => { if (muted || document.hidden) { pauseBeds(); if (thenSuspend) ctx.suspend().catch(() => {}); } }, secs * 1000 + 30);
    state.state = muted ? 'muted' : 'paused';
  }

  const onGesture = e => {
    if (e.target && e.target.closest && e.target.closest('[data-sound-toggle], [data-title-font]')) return;   // the toggle handles itself; the font toggle is not a sound gesture
    if (e instanceof KeyboardEvent && (e.metaKey || e.ctrlKey || e.altKey)) return;
    removeEventListener('pointerdown', onGesture, true); removeEventListener('keydown', onGesture, true);
    if (!muted && !started) start(FADE_IN);
  };
  addEventListener('pointerdown', onGesture, true);
  addEventListener('keydown', onGesture, true);

  toggle.addEventListener('click', () => {
    if (started && !muted) { muted = true; write('off'); silence(FADE_OUT, true); }
    else { muted = false; write('on'); start(FADE_IN); }
    paint();
  });
  document.addEventListener('visibilitychange', () => {
    if (!started || muted) return;
    if (document.hidden) silence(FADE_HIDE, true);
    else start(FADE_IN);
  });
  toggle.hidden = false;
  paint();
}

guideSound();
