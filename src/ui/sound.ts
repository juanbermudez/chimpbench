import type { Ctx } from './app';
import type { SoundControls } from './contracts';
import { icon } from './icons';

// Sound UI, self-contained so the HUD and Settings can host it wherever their layout puts it:
//  - mountSoundButton: the speaker toggle (first click also unlocks audio; S toggles too)
//  - soundSettingsHtml / bindSoundSettings: the Settings › Sound block (bus volumes, bonobo pool)
// The engine lives in src/audio and reaches the UI only through UiDeps.getSound (absent in the preview).

const sound = (ctx: Ctx): SoundControls | null => ctx.deps.getSound?.() ?? null;

/** S key and the HUD button. While audio is locked this starts it (a user gesture), otherwise it toggles mute. */
export function toggleSound(ctx: Ctx, announce = false): void {
  const s = sound(ctx);
  if (!s || s.status() === 'unavailable') return;
  const wasLocked = s.status() === 'locked';
  s.toggleMute();
  if (announce) ctx.notify({ text: wasLocked || !s.settings().muted ? 'Sound on · S to mute' : 'Sound off · S to turn on', cat: 'system', title: 'Sound' });
}

/** Fills `slot` with the speaker button; call update() on the HUD refresh. */
export function mountSoundButton(slot: HTMLElement, ctx: Ctx): { update(): void } {
  slot.innerHTML = `<button class="hud-btn icon-only snd-btn" data-sound-toggle aria-keyshortcuts="S" aria-pressed="false">${icon('speaker')}</button>`;
  const btn = slot.querySelector<HTMLButtonElement>('button')!;
  btn.onclick = () => { toggleSound(ctx); update(); };
  let key = '';
  function update() {
    const s = sound(ctx);
    const status = s?.status() ?? 'unavailable', muted = s?.settings().muted ?? true;
    const k = `${status}|${muted}`;
    if (k === key) return;
    key = k;
    slot.hidden = status === 'unavailable';
    btn.innerHTML = icon(muted ? 'speakerOff' : 'speaker');
    btn.dataset.state = muted ? 'muted' : status === 'locked' ? 'locked' : 'on';
    btn.setAttribute('aria-pressed', String(!muted && status !== 'locked'));
    const label = muted ? 'Turn sound on (S)' : status === 'locked' ? 'Sound starts on your first click (S)' : 'Mute sound (S)';
    btn.setAttribute('aria-label', label); btn.title = label;
  }
  update();
  return { update };
}

const SLIDERS: [key: 'master' | 'ambience' | 'animals' | 'weather', label: string, hint: string][] = [
  ['master', 'Master', 'Everything, after the limiter.'],
  ['ambience', 'Ambience', 'Dawn and dusk birds, night insects, the stream.'],
  ['animals', 'Animals', 'Chimpanzee calls and drumming. Fades out in the zoomed-out overview.'],
  ['weather', 'Weather', 'Rain, storm and thunder.'],
];

/** The Settings › Sound block (a heading plus rows); bind it with bindSoundSettings after it is in the DOM. */
export function soundSettingsHtml(): string {
  return `<section class="snd-set" data-sound-settings aria-labelledby="snd-h">
    <h3 class="eyebrow" id="snd-h">Sound</h3>
    <div class="set-grid">
      ${SLIDERS.map(([k, label, hint]) => `<label class="set-row snd-row"><span><b>${label}</b><i>${hint}</i></span>
        <span class="snd-ctl"><input type="range" class="snd-range" min="0" max="100" step="1" data-snd="${k}" aria-label="${label} volume"><output class="mono" data-snd-out="${k}">0</output></span></label>`).join('')}
      <label class="set-row snd-row"><span><b>Fill gaps with bonobo recordings</b><i>Different species (Pan paniscus), higher-pitched and without the pant-hoot. Off keeps every voice a chimpanzee recording.</i></span>
        <span class="switch snd-switch"><input type="checkbox" role="switch" data-snd="bonobo" aria-label="Fill gaps with bonobo recordings (different species)"><span class="sw"></span></span></label>
    </div>
    <p class="honest">Chimpanzee voices are library recordings of unknown site. The birds and rain were recorded in the Andaman Islands and the storm in the Himalaya: stand-ins for Kibale, not recordings of it. Buttress drumming and laughter are synthesized. Per-individual pitch is a stylization. Sources: <a href="/audio/SOURCES.md" target="_blank" rel="noopener">audio/SOURCES.md</a>.</p>
  </section>`;
}

export function bindSoundSettings(root: HTMLElement, ctx: Ctx): { sync(): void } {
  const block = root.querySelector<HTMLElement>('[data-sound-settings]');
  if (!block) return { sync() {} };
  block.addEventListener('input', e => {
    const el = e.target as HTMLInputElement, k = el.dataset.snd, s = sound(ctx);
    if (!s || !k) return;
    if (k === 'bonobo') s.set({ bonobo: el.checked });
    else { s.set({ [k]: Number(el.value) / 100 }); const out = block.querySelector(`[data-snd-out="${k}"]`); if (out) out.textContent = el.value; }
  });
  function sync() {
    const s = sound(ctx);
    block!.hidden = !s || s.status() === 'unavailable';
    if (!s) return;
    const v = s.settings();
    for (const [k] of SLIDERS) {
      const input = block!.querySelector<HTMLInputElement>(`[data-snd="${k}"]`)!, value = String(Math.round(v[k] * 100));
      input.value = value;
      block!.querySelector(`[data-snd-out="${k}"]`)!.textContent = value;
    }
    block!.querySelector<HTMLInputElement>('[data-snd="bonobo"]')!.checked = v.bonobo;
  }
  return { sync };
}
