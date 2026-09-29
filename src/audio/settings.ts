// Persisted sound settings (localStorage, per browser). Storage can be missing or throw (private windows,
// blocked site data), so every access is guarded and the defaults always work.

export interface SoundSettings {
  muted: boolean;
  /** Linear 0..1 bus volumes. */
  master: number; ambience: number; animals: number; weather: number;
  /** Add the processed bonobo clips (a different species) to thin chimpanzee pools. Off by default. */
  bonobo: boolean;
}

export const DEFAULT_SOUND: Readonly<SoundSettings> = { muted: false, master: 0.8, ambience: 0.8, animals: 1, weather: 0.8, bonobo: false };
export const SOUND_KEY = 'mgogo.sound.v1';

const unit = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);

/** Any stored value → valid settings (unknown fields dropped, out-of-range volumes clamped). */
export function sanitizeSound(raw: unknown): SoundSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    muted: typeof r.muted === 'boolean' ? r.muted : DEFAULT_SOUND.muted,
    master: unit(r.master, DEFAULT_SOUND.master), ambience: unit(r.ambience, DEFAULT_SOUND.ambience),
    animals: unit(r.animals, DEFAULT_SOUND.animals), weather: unit(r.weather, DEFAULT_SOUND.weather),
    bonobo: typeof r.bonobo === 'boolean' ? r.bonobo : DEFAULT_SOUND.bonobo,
  };
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;
function defaultStorage(): KV | null { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } }

export function loadSound(storage: KV | null = defaultStorage()): SoundSettings {
  try { const s = storage?.getItem(SOUND_KEY); return sanitizeSound(s ? JSON.parse(s) : null); } catch { return { ...DEFAULT_SOUND }; }
}
export function saveSound(settings: SoundSettings, storage: KV | null = defaultStorage()): void {
  try { storage?.setItem(SOUND_KEY, JSON.stringify(settings)); } catch { /* storage unavailable: settings last for this session */ }
}
