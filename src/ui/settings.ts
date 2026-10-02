import type { Ctx } from './app';
import type { Quality } from '../types';
import { icon } from './icons';
import { esc } from './format';
import { bindSoundSettings, soundSettingsHtml } from './sound';

// Settings dialog: render quality, frame-rate cap, biological aging mode, reseed, export, guide, shortcuts.

export const SHORTCUTS: [string, string][] = [
  ['Space', 'Play / pause'], ['1 – 7', 'Speed presets (1 is real time)'], ['F', 'Focus camera on selected'], ['C', 'Close view'], ['V', 'Cinematic view'],
  ['T', 'Society overview'], ['E', 'Field experiments'], ['M', 'Model panel'], ['L', 'Toggle labels'], ['S', 'Sound on / off'], ['B', 'Show / hide sidebar'], ['I', 'Show / hide inspector'], ['[  ]', 'Previous / next in community'], ['Esc', 'Close overlays'],
];

export function createSettings(dialog: HTMLDialogElement, ctx: Ctx) {
  dialog.innerHTML = `<form method="dialog" class="dlg" tabindex="-1" autofocus>
    <header class="dock-head"><div><h2>Settings</h2></div><button class="icon-btn" value="close" aria-label="Close settings">${icon('close')}</button></header>
    <div class="set-grid">
      <label class="set-row"><span><b>Render quality</b><i id="quality-note">Lower it if the frame rate drops at high speed.</i></span>
        <span class="seg" role="radiogroup" aria-label="Render quality">${(['low', 'medium', 'high'] as Quality[]).map(q => `<button type="button" role="radio" data-quality="${q}">${q.charAt(0).toUpperCase() + q.slice(1)}</button>`).join('')}</span></label>
      <label class="set-row"><span><b>Frame rate</b><i>60 fps is steadier on 120 Hz displays and uses less power.</i></span>
        <span class="seg" role="radiogroup" aria-label="Frame rate"><button type="button" role="radio" data-fpscap="1">60 fps</button><button type="button" role="radio" data-fpscap="0">Uncapped</button></span></label>
      <label class="set-row"><span><b>Biological aging</b><i id="aging-note"></i></span>
        <select id="aging"><option value="1">Natural · 1 day per day</option><option value="365">Life course · 1 year per day (365×)</option></select></label>
      <div class="set-row"><span><b>World seed</b><i>Same seed and settings replay the same rule-driven world.</i></span>
        <span class="seed"><input id="seed" type="number" inputmode="numeric" min="0" aria-label="Seed"><button type="button" class="btn" data-act="seed">${icon('dice')}New world</button></span></div>
      <div class="set-row"><span><b>Snapshot</b><i>World state plus the last 200 decision traces, as JSON.</i></span><button type="button" class="btn" data-act="export">${icon('download')}Export</button></div>
      <div class="set-row"><span><b>Science guide</b><i>Model, evidence levels and assumptions.</i></span><a class="btn" href="${esc(ctx.deps.guideUrl)}" target="_blank" rel="noopener">${icon('arrowUR')}Open guide</a></div>
    </div>
    ${soundSettingsHtml()}
    <p class="honest">Life course mode compresses age, gestation and mortality so a lifetime can be explored; feeding and travel stay on ecological time. This separation of clocks is an experimental control, not a biological claim. Rates, skills and community dynamics are illustrative and need validation against field data.</p>
    <p class="mono" id="life-stats"></p>
    <h3 class="eyebrow">Keyboard</h3>
    <dl class="keys">${SHORTCUTS.map(([k, v]) => `<div><dt><kbd>${k}</kbd></dt><dd>${v}</dd></div>`).join('')}</dl>
  </form>`;
  const aging = dialog.querySelector<HTMLSelectElement>('#aging')!, seed = dialog.querySelector<HTMLInputElement>('#seed')!;
  const note = dialog.querySelector<HTMLElement>('#aging-note')!, stats = dialog.querySelector<HTMLElement>('#life-stats')!, qnote = dialog.querySelector<HTMLElement>('#quality-note')!;
  const soundSettings = bindSoundSettings(dialog, ctx);
  const sync = () => {
    soundSettings.sync();
    const w = ctx.world();
    aging.value = w.ageRate === 1 ? '1' : '365';
    note.textContent = w.ageRate === 1 ? 'Natural aging keeps ecological and biological time aligned.' : 'Each ecological day adds one biological year. Exploratory.';
    // Show what the renderer is actually using; auto-downgrade can lower it below the request.
    const eff = ctx.deps.getScene()?.getQuality?.() ?? ctx.state.quality;
    dialog.querySelectorAll<HTMLElement>('[data-quality]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.quality === eff)));
    const cap = ctx.deps.getScene()?.getFrameCap?.() ?? true;
    dialog.querySelectorAll<HTMLElement>('[data-fpscap]').forEach(b => b.setAttribute('aria-checked', String((b.dataset.fpscap === '1') === cap)));
    qnote.textContent = eff !== ctx.state.quality ? `Running at ${eff}: lowered automatically from ${ctx.state.quality} to hold the frame rate.` : 'Lower it if the frame rate drops at high speed.';
    stats.textContent = `Seed ${w.seed} · day ${w.day} · ${w.stats?.births ?? w.births} births · ${w.stats?.deaths ?? w.deaths} deaths · ${w.stats?.takeovers ?? 0} takeovers · ${w.stats?.transfers ?? 0} transfers`;
  };
  aging.onchange = () => { ctx.world().ageRate = Number(aging.value); sync(); };
  dialog.addEventListener('click', e => {
    const el = e.target as HTMLElement;
    const q = el.closest<HTMLElement>('[data-quality]'); if (q) { ctx.state.quality = q.dataset.quality as Quality; ctx.deps.setQuality(ctx.state.quality); sync(); }
    const fc = el.closest<HTMLElement>('[data-fpscap]'); if (fc) { ctx.deps.getScene()?.setFrameCap?.(fc.dataset.fpscap === '1'); sync(); }
    const act = el.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'seed') { const n = Number(seed.value); ctx.newWorld(Number.isFinite(n) && seed.value !== '' ? n >>> 0 : ctx.world().seed + 1); dialog.close(); }
    if (act === 'export') ctx.exportSnapshot();
  });
  return { open() { seed.value = String(ctx.world().seed + 1); sync(); dialog.showModal(); } };
}
