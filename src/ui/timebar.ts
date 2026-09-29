import type { Ctx } from './app';
import type { SimEvent } from '../types';
import { feedCat, formatRate, timeParts } from './format';
import { setAttr, setText } from './morph';
import { modelChipState } from './hud';

// Time & model panel: the dropdown under the menu bar's clock control. Rate presets, the achieved-rate readout,
// honest clock state (sim-limited vs waiting on the model), a 24 h strip (daylight band 06–18, today's events as
// ticks; notable ones in category colour) and a summary of the decision model (policy, roster, readiness).
// Play/pause and the current rate live on the menu bar itself; this panel only updates while it is open.

export function presetLabel(eco: number, label: string): string {
  return Number.isFinite(eco) ? formatRate(eco) : label || 'Max';
}

const POLICY_WORD: Record<string, string> = { off: 'Off: rules decide for every chimp', async: 'Async: the clock never waits', lockstep: 'Lockstep: the clock waits for each answer' };
const ROSTER_WORD: Record<string, string> = { selected: 'the selected chimp', 'focal-set': 'the focal set', all: 'every living chimp' };

export function createTimebar(root: HTMLElement, ctx: Ctx) {
  const { clock, speedPresets } = ctx.deps;
  root.innerHTML = `
  <section class="td-sec" aria-labelledby="td-speed-h">
    <div class="td-head"><h3 class="eyebrow" id="td-speed-h">Speed <span class="muted">keys 1–6 · Space pauses</span></h3><span class="td-readout" aria-live="off"><b class="tb-rate" data-k="rate">—</b><span class="tb-tps" data-k="tps">0 ticks/s</span></span></div>
    <div class="tb-speeds" role="radiogroup" aria-label="Simulation speed">
      ${speedPresets.map((p, i) => `<button role="radio" data-speed="${p.id}" aria-keyshortcuts="${i + 1}" title="${Number.isFinite(p.ecoSecondsPerSecond) ? `${formatRate(p.ecoSecondsPerSecond)} of ecological time per real second` : 'As fast as the CPU budget allows, still one tick at a time'} (key ${i + 1})"><span class="sp-key">${i + 1}</span>${presetLabel(p.ecoSecondsPerSecond, p.label)}</button>`).join('')}
    </div>
    <div class="tb-state" data-k="state" role="status"></div>
  </section>
  <section class="td-sec" aria-label="Today">
    <div class="td-head"><h3 class="eyebrow">Today</h3><span class="muted td-legend">daylight 06–18 · ticks are events</span></div>
    <svg class="tb-day" viewBox="0 0 240 12" preserveAspectRatio="none" aria-hidden="true">
      <rect class="tb-night" x="0" y="4" width="240" height="4" rx="2"/><rect class="tb-light" x="60" y="4" width="120" height="4"/>
      <g data-k="ticks"></g>
      <rect data-k="needle" class="tb-needle" x="0" y="0" width="2" height="12" rx="1"/>
    </svg>
    <span class="tb-hours mono"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></span>
  </section>
  <section class="td-sec td-model" aria-labelledby="td-model-h">
    <div class="td-head"><h3 class="eyebrow" id="td-model-h">Decision model</h3><button class="link-btn" data-act="model" aria-keyshortcuts="M">Model panel<kbd>M</kbd></button></div>
    <p class="td-mstate"><span class="led" data-k="led"></span><b data-k="mstate">Rules only</b></p>
    <p class="td-mline" data-k="mline"></p>
  </section>`;
  const $ = (n: string) => root.querySelector<HTMLElement>(`[data-k="${n}"]`)!;
  const rate = $('rate'), tps = $('tps'), state = $('state'), needle = $('needle'), ticks = $('ticks'), led = $('led'), mstate = $('mstate'), mline = $('mline');
  root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b => { b.onclick = () => ctx.setSpeed(b.dataset.speed!); });
  const speeds = [...root.querySelectorAll<HTMLButtonElement>('[data-speed]')];
  const set = setText;
  let speedKey = '', tickDay = -1, lastEv: SimEvent | null = null;
  return {
    update() {
      const w = ctx.world();
      if (clock.speedId !== speedKey) { speedKey = clock.speedId; speeds.forEach(b => { const on = b.dataset.speed === clock.speedId; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); }
      set(rate, clock.playing ? formatRate(clock.effectiveRate) : 'Paused');
      // Paused shows only "Paused": the smoothed tick rate is still decaying and would read as work being done.
      set(tps, clock.playing ? `${Math.round(clock.ticksPerSecond).toLocaleString()} ticks/s` : '');
      let st = 'ok', text = 'Running · every chimp resolves every tick';
      const target = clock.ecoSecondsPerSecond;
      if (!clock.playing) { st = 'paused'; text = 'Paused · Space to resume'; }
      else if (clock.blockedByModel) { st = 'blocked'; text = 'Waiting on model · lockstep holds the clock until GLiNER answers'; }
      else if (clock.limited) { st = 'limited'; text = `Sim-limited · every tick still runs; capped at ${formatRate(clock.effectiveRate)}${Number.isFinite(target) ? ` of ${formatRate(target)}` : ''}`; }
      if (state.dataset.state !== st) state.dataset.state = st;
      set(state, text);
      if (root.dataset.state !== st) root.dataset.state = st;
      const nx = Math.max(0, Math.min(238, (w.hour / 24) * 240 - 1)).toFixed(0);
      if (needle.getAttribute('x') !== nx) needle.setAttribute('x', nx);
      // Event ticks for the current calendar day: appended as events land, rebuilt when the day turns. The event
      // log is capped (oldest spliced off), so new events are found by identity from the end, not by index.
      let i = w.events.length - 1;
      while (i >= 0 && w.events[i] !== lastEv) i--;
      let start = i + 1;
      if (w.day !== tickDay || i < 0) { tickDay = w.day; start = 0; ticks.textContent = ''; }
      let add = '';
      for (let j = start; j < w.events.length; j++) {
        const e = w.events[j]; if ((e.severity ?? 0) < 1) continue;
        const p = timeParts(w, e.time); if (p.day !== w.day) continue;
        add += `<rect class="tick k-${feedCat(e.kind)}${e.severity >= 2 ? ' major' : ''}" x="${((p.hour / 24) * 240).toFixed(1)}" y="${e.severity >= 2 ? 0 : 2}" width="1.4" height="${e.severity >= 2 ? 12 : 8}"/>`;
      }
      lastEv = w.events[w.events.length - 1] ?? null;
      if (add) ticks.insertAdjacentHTML('beforeend', add);
      const chip = modelChipState(ctx), d = ctx.deps.decider, mode = w.modelPolicy.mode;
      setAttr(led, 'data-tone', chip.tone); set(mstate, chip.text);
      set(mline, mode === 'off' ? POLICY_WORD.off : `${POLICY_WORD[mode] ?? mode} · decides for ${ROSTER_WORD[d.roster] ?? d.roster}${d.focalIds.length ? ` (${d.focalIds.length} now)` : ''}`);
    },
  };
}
