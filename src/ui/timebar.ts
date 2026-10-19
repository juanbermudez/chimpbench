import type { Ctx } from './app';
import type { SimEvent } from '../types';
import { TICK_SECONDS } from '../simulation';
import { feedCat, formatRate, timeParts } from './format';
import { morph, setAttr, setText } from './morph';
import { driveBlock } from './who-decides';
import { modelChipState } from './hud';

// Time & model panel: the dropdown under the menu bar's clock control. Rate presets, the achieved-rate readout,
// honest clock state (sim-limited vs waiting on the model), a 24 h strip (daylight band 06–18, today's events as
// ticks; notable ones in category colour) and a summary of the decision model (policy, roster, readiness).
// Play/pause and the current rate live on the menu bar itself; this panel only updates while it is open.

export function presetLabel(eco: number, label: string): string {
  if (eco === 1) return 'Real time';
  if (eco < 60 && label) return label;   // a named pace below 1 min/s (the watching speed); faster presets show their rate
  return Number.isFinite(eco) ? formatRate(eco) : label || 'Max';
}

const POLICY_WORD: Record<string, string> = { off: 'Off: rules decide for every chimp', async: 'Async: the clock never waits', lockstep: 'Lockstep: the clock waits for each answer' };
const ROSTER_WORD: Record<string, string> = { selected: 'the selected chimp', 'focal-set': 'the focal set', all: 'every living chimp' };

export function createTimebar(root: HTMLElement, ctx: Ctx) {
  const { clock, speedPresets } = ctx.deps;
  root.innerHTML = `
  <section class="td-sec" aria-labelledby="td-speed-h">
    <div class="td-head"><h3 class="eyebrow" id="td-speed-h">Speed <span class="muted">keys 1–${speedPresets.length} · Space pauses</span></h3><span class="td-readout" aria-live="off"><b class="tb-rate" data-k="rate">—</b><span class="tb-tps" data-k="tps">0 ticks/s</span></span></div>
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
    <div data-k="drive"></div>
  </section>`;
  const $ = (n: string) => root.querySelector<HTMLElement>(`[data-k="${n}"]`)!;
  const rate = $('rate'), tps = $('tps'), state = $('state'), needle = $('needle'), ticks = $('ticks'), led = $('led'), mstate = $('mstate'), mline = $('mline'), driveEl = $('drive');
  root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b => { b.onclick = () => ctx.setSpeed(b.dataset.speed!); });
  const speeds = [...root.querySelectorAll<HTMLButtonElement>('[data-speed]')];
  const set = setText;
  let speedKey = '', tickDay = -1, lastEv: SimEvent | null = null;
  return {
    update() {
      const w = ctx.world();
      if (clock.speedId !== speedKey) { speedKey = clock.speedId; speeds.forEach(b => { const on = b.dataset.speed === clock.speedId; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); }
      // Paused shows only "Paused": the smoothed tick rate is still decaying and would read as work being done.
      // Below one tick per second (real time: one 15-s tick every 15 s) a rounded rate would read "0 ticks/s", and the
      // measured rate swings by half between ticks although every tick lands on time: show the rate being kept.
      const slow = clock.ecoSecondsPerSecond < TICK_SECONDS && !clock.limited;
      // the mode "Model decides for every adult" (src/drive): the rate achieved over the last real minute, the waits for
      // the model included, as the menu bar shows it (the half-second rate swings between 0 in a pass and full speed)
      const driven = ctx.deps.drive?.() ?? null, got = driven?.achieved;
      if (driven && got) {
        set(rate, !clock.playing ? 'Paused' : got.rate === null ? 'measuring' : formatRate(got.rate));
        set(tps, !clock.playing || got.rate === null ? '' : `achieved, last ${got.seconds >= 59 ? 'minute' : `${Math.round(got.seconds)} s`}`);
      } else {
        set(rate, !clock.playing ? 'Paused' : formatRate(slow && !clock.blockedByModel ? clock.ecoSecondsPerSecond : clock.effectiveRate));
        set(tps, !clock.playing ? '' : slow ? `1 tick / ${+(TICK_SECONDS / clock.ecoSecondsPerSecond).toFixed(1)} s` : `${Math.round(clock.ticksPerSecond).toLocaleString()} ticks/s`);
      }
      const target = clock.ecoSecondsPerSecond;
      // Stage W1: above the rate at which this map's walk can be drawn with real steps the picture is time-lapse; say so.
      let st = 'ok', text = target > (ctx.deps.lapseRate?.() ?? Infinity) ? 'Time-lapse · bodies outrun their steps; every tick still runs' : 'Running · every chimp resolves every tick';
      if (!clock.playing) { st = 'paused'; text = 'Paused · Space to resume'; }
      else if (driven) { st = clock.blockedByModel ? 'blocked' : 'ok'; text = 'Model decides for every adult · the clock waits for every answer; the rules do not fill in for a slow model'; }
      else if (clock.blockedByModel) { st = 'blocked'; text = 'Waiting on model · lockstep holds the clock until the model answers'; }
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
      const chip = modelChipState(ctx), d = ctx.deps.decider, mode = w.modelPolicy.mode, drive = ctx.deps.drive?.() ?? null;
      setAttr(led, 'data-tone', drive?.problem ? 'warn' : chip.tone); set(mstate, drive ? 'Model decides for every adult' : chip.text);
      set(mline, drive ? `${POLICY_WORD.lockstep} · every animal aged ${drive.minAge} or over through the trained adapter` : mode === 'off' ? POLICY_WORD.off : `${POLICY_WORD[mode] ?? mode} · decides for ${ROSTER_WORD[d.roster] ?? d.roster}${d.focalIds.length ? ` (${d.focalIds.length} now)` : ''}`);
      morph(driveEl, drive ? driveBlock(drive, w, clock.playing) : '');
    },
  };
}
