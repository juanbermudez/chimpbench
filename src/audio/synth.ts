// Synthesized one-shots for call kinds that have no recording among the sources (see public/audio/SOURCES.md).
// Both are stylizations, generated once at load as plain sample arrays (pure, seeded, testable).
//  - drum: buttress drumming. Low 50–120 Hz thumps with a short broadband slap, in irregular bursts that
//    tend to speed up. Design assumption for the rhythm; drumming often accompanies a pant-hoot climax.
//  - laugh: play pant ("laughter"). Breathy noise pants through two formant bands with a faint voiced
//    grunt, alternating stronger exhale and weaker inhale at ≈4–6 per second. Design assumption.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(x: Float32Array, peak: number): Float32Array {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m;
  return x;
}

/** RBJ band-pass (constant 0 dB peak) coefficients; returns a stateful per-sample filter. */
function bandpass(sampleRate: number, freq: number, q: number): (x: number) => number {
  const w = 2 * Math.PI * freq / sampleRate, alpha = Math.sin(w) / (2 * q), a0 = 1 + alpha;
  const b0 = alpha / a0, b2 = -alpha / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - alpha) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x: number) => { const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}

/** A buttress-drumming bout: 3–6 beats, mono, peak-normalized to 0.9. */
export function synthDrum(sampleRate: number, seed: number): Float32Array {
  const rnd = mulberry32(seed);
  const beats = 3 + Math.floor(rnd() * 4);
  const times: number[] = [];
  let t = 0.02, gap = 0.2 + rnd() * 0.15;
  for (let b = 0; b < beats; b++) { times.push(t); t += gap; gap = Math.max(0.09, gap * (0.7 + rnd() * 0.35)); }
  const out = new Float32Array(Math.ceil((t + 0.7) * sampleRate));
  const slapBand = bandpass(sampleRate, 1400 + rnd() * 600, 0.8);
  for (const start of times) {
    const amp = 0.55 + 0.45 * rnd(), f0 = 95 + rnd() * 25, f1 = 48 + rnd() * 10, decay = 0.13 + rnd() * 0.08;
    const s0 = Math.floor(start * sampleRate), n = Math.floor(0.65 * sampleRate);
    let phase = 0, phase2 = 0;
    for (let i = 0; i < n && s0 + i < out.length; i++) {
      const u = i / sampleRate;
      const f = f1 + (f0 - f1) * Math.exp(-u / 0.035);           // pitch drops as the buttress rings down
      phase += 2 * Math.PI * f / sampleRate; phase2 += 2 * Math.PI * f * 2.4 / sampleRate;
      const env = (1 - Math.exp(-u / 0.0015)) * Math.exp(-u / decay);
      const body = Math.sin(phase) * env + 0.3 * Math.sin(phase2) * Math.exp(-u / 0.05);
      const slap = u < 0.03 ? slapBand((rnd() * 2 - 1)) * Math.exp(-u / 0.004) * 1.6 : 0; // hand/foot contact
      out[s0 + i] += amp * (body + slap);
    }
  }
  return normalize(out, 0.9);
}

/** A bout of play panting: 1.4–2.4 s, mono, peak-normalized to 0.55. */
export function synthLaugh(sampleRate: number, seed: number): Float32Array {
  const rnd = mulberry32(seed);
  const dur = 1.4 + rnd() * 1.0, rate = 4.5 + rnd() * 1.5, f0 = 220 + rnd() * 60;
  const n = Math.ceil(dur * sampleRate), out = new Float32Array(n);
  const fa = bandpass(sampleRate, 750 + rnd() * 150, 3), fb = bandpass(sampleRate, 1600 + rnd() * 300, 3), fv = bandpass(sampleRate, f0 * 2, 1.2);
  const period = 1 / rate;
  let voicePhase = 0;
  for (let i = 0; i < n; i++) {
    const u = i / sampleRate, k = Math.floor(u / period), local = u - k * period;
    const exhale = k % 2 === 0, strength = (exhale ? 1 : 0.6) * (0.8 + 0.2 * Math.sin(k * 1.7 + seed));
    const env = strength * (1 - Math.exp(-local / 0.015)) * Math.exp(-local / 0.07);
    const noise = rnd() * 2 - 1;
    voicePhase += f0 / sampleRate; if (voicePhase >= 1) voicePhase -= 1;
    const voiced = exhale ? fv(voicePhase * 2 - 1) * 0.25 : 0;         // faint grunt on the exhale
    const bout = Math.min(1, u / 0.08, (dur - u) / 0.2);
    out[i] = bout * env * (fa(noise) + 0.6 * fb(noise) + voiced);
  }
  return normalize(out, 0.55);
}
