import type { Ctx } from './app';
import { icon } from './icons';
import { calendar, esc, formatRate, hhmm, rainWord, weatherIcon, windWord } from './format';
import { mountSoundButton } from './sound';
import { setAttr, setText } from './morph';
import { saveIndicator } from './simulations';
import { presetLabel } from './timebar';

// Menu bar: one opaque bar (brand · simulation · clock control · time · weather · population |
// sound · panels · settings · guide). Every changing readout sits in a fixed-width slot (see style.css),
// so values never shift the bar. The skeleton is built once; values are patched in place
// (text-node data, guarded attributes) so the 4 Hz refresh mutates only what changed.

export function modelChipState(ctx: Ctx): { tone: string; text: string } {
  const d = ctx.deps.decider, mode = ctx.world().modelPolicy.mode;
  if (mode === 'off') return { tone: 'off', text: 'Rules only' };
  if (!d.ready) return d.phase === 'loading' ? { tone: 'loading', text: 'Model loading' } : { tone: 'warn', text: d.phase === 'unavailable' ? 'Model offline' : 'Model not ready' };
  if (ctx.deps.clock.blockedByModel) return { tone: 'wait', text: 'Awaiting model' };
  return { tone: d.busy ? 'busy' : 'ok', text: `GLiNER · ${mode}` };
}

export function createHud(root: HTMLElement, ctx: Ctx) {
  root.setAttribute('data-occluder', '');
  root.innerHTML = `
  <div class="bar-group bar-brand">
    <span class="wordmark">ChimpBench</span>
  </div>
  <div class="bar-sep"></div>
  <div class="bar-group bar-sim" data-sim>
    <button class="sim-btn" data-act="sims" aria-haspopup="dialog" title="Simulations: new, open, save, export"><span class="sim-name" data-k="simname">Simulation</span>${icon('chevron')}</button>
    <span class="save-ind" data-k="saveind" role="status" aria-live="polite"><i class="save-dot" aria-hidden="true"></i><span class="save-text" data-k="savetext"></span></span>
  </div>
  <div class="bar-sep" data-sim></div>
  <div class="bar-group bar-clockctl">
    <button class="tc-play" data-k="play" aria-keyshortcuts="Space" aria-label="Pause (Space)" title="Play / pause (Space)">${icon('pause')}</button>
    <button class="tc-rate" data-act="time" aria-haspopup="dialog" aria-expanded="false" aria-controls="time-drop" title="Time controls and decision model (speeds 1–7)">
      <span class="tc-text"><span class="tc-speed" data-k="speed">1 min/s</span><span class="tc-achieved" data-k="achieved">—</span></span>${icon('chevron')}
    </button>
  </div>
  <div class="bar-group bar-time" role="group" aria-label="Ecological time">
    <span class="clock-big" data-k="time" aria-live="off">08:00</span>
    <div class="date-block"><span class="dt-main"><span data-k="day">Day 1</span><span data-k="date">1 Jan</span></span><span class="season" data-k="season">Wet season</span></div>
    <span class="dayarc" aria-hidden="true"><svg viewBox="0 0 96 44"><path class="arc-sky" d="M8 38 A40 40 0 0 1 88 38" /><line class="arc-horizon" x1="2" y1="38" x2="94" y2="38"/></svg><span class="arc-bodies"><i class="arc-sun" data-k="sun"></i><i class="arc-moon" data-k="moon"></i></span></span>
  </div>
  <div class="bar-sep"></div>
  <div class="weather" role="group" aria-label="Weather">
    <span class="wx-icon" data-k="wxicon">${icon('sun')}</span>
    <div class="wx-main"><b data-k="temp">—</b><span data-k="wxword">Clear</span></div>
    <div class="wx-sub"><span>Rain <i data-k="rain">0%</i></span><span data-k="wind">Calm</span></div>
  </div>
  <div class="bar-sep"></div>
  <div class="pop" title="Living individuals · births · deaths since the run started">
    <span class="pop-main"><b data-k="alive">0</b><span>alive</span></span>
    <span class="pop-sub"><b data-k="births">0</b> born · <b data-k="deaths">0</b> died</span>
  </div>
  <div class="bar-spacer"></div>
  <div class="bar-group bar-actions">
    <span class="snd-slot" data-slot="sound"></span>
    <button class="hud-btn" data-act="society" aria-keyshortcuts="T" title="Society overview (T)">${icon('tree')}<span>Society</span></button>
    <button class="hud-btn" data-act="experiments" aria-keyshortcuts="E" title="Field experiments (E)">${icon('flask')}<span>Experiments</span></button>
    <div class="bar-sep"></div>
    <button class="hud-btn icon-only" data-act="settings" aria-label="Settings" title="Settings">${icon('gear')}</button>
    <a class="hud-btn icon-only" href="${esc(ctx.deps.guideUrl)}" target="_blank" rel="noopener noreferrer" data-guide aria-label="Science & design guide (opens in a new tab)" title="Science & design guide (new tab)">${icon('help')}</a>
  </div>`;
  const k = (name: string) => root.querySelector<HTMLElement>(`[data-k="${name}"]`)!;
  const el = Object.fromEntries(['alive', 'births', 'deaths', 'day', 'time', 'date', 'season', 'sun', 'moon', 'wxicon', 'temp', 'wxword', 'rain', 'wind', 'play', 'speed', 'achieved'].map(n => [n, k(n)]));
  const weatherEl = root.querySelector<HTMLElement>('.weather')!;
  el.play.onclick = () => { ctx.deps.setPlaying(!ctx.deps.clock.playing); ctx.refresh(); };
  root.querySelector<HTMLButtonElement>('[data-act="time"]')!.onclick = () => ctx.toggleTimePanel();
  root.querySelector<HTMLButtonElement>('[data-act="experiments"]')!.onclick = () => ctx.setDock(ctx.state.dock === 'experiments' ? null : 'experiments');
  root.querySelector<HTMLButtonElement>('[data-act="society"]')!.onclick = () => ctx.openSociety();
  root.querySelector<HTMLButtonElement>('[data-act="settings"]')!.onclick = () => ctx.openSettings();
  root.querySelector<HTMLButtonElement>('[data-act="sims"]')!.onclick = () => ctx.openSimulations();
  // Saved simulations are optional (absent in the synthetic preview): the name button and indicator hide with them.
  const persist = ctx.deps.persistence ?? null;
  if (!persist) root.querySelectorAll<HTMLElement>('[data-sim]').forEach(n => { n.hidden = true; });
  const simName = k('simname'), saveInd = k('saveind'), saveText = k('savetext');
  const soundButton = mountSoundButton(root.querySelector<HTMLElement>('[data-slot="sound"]')!, ctx);
  const podTime = root.querySelector<HTMLElement>('.bar-time')!, clockCtl = root.querySelector<HTMLElement>('.bar-clockctl')!;
  let lastIcon = '', moonDx = 99, playing: boolean | null = null;
  // Sun / moon position, driven every animation frame (transform only; see frame()).
  let lastFrame = 0, sweep = -1, lastSun = '', lastMoon = '';
  const set = setText, attr = setAttr;
  // The weather detail tooltip is only read on hover, so it is written then, not on every refresh.
  weatherEl.addEventListener('pointerenter', () => {
    const env = ctx.world().environment;
    attr(weatherEl, 'title', `Rain intensity ${Math.round(env.rain * 100)}% · cloud ${Math.round(env.cloud * 100)}% · humidity ${Math.round(env.humidity * 100)}% · wind ${Math.round(env.wind * 100)}% of scale · fruit index ${Math.round(env.fruitIndex * 100)}%`);
  });

  return {
    /**
     * Per animation frame: turn the sky dial. Sun and moon sit opposite each other on a circle whose upper half is
     * the arc (sunrise 06:00 on the left, noon at the top, sunset 18:00 on the right); below the horizon they are
     * clipped, so either body sets and rises continuously with no jump at dusk or dawn. The hour is interpolated
     * with the clock's accrued sub-tick time. Faster than 1 day/s an exact dial would spin several turns a second
     * (strobing), so it becomes a steady sweep of one day per second; the digits keep the exact time. Only two
     * composited transforms change: no layout, no paint.
     */
    frame(now: number) {
      const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0; lastFrame = now;
      const w = ctx.world(), clk = ctx.deps.clock, rate = clk.playing ? clk.effectiveRate : 0;
      const exact = (w.hour + (clk.playing ? (clk.accumulator ?? 0) / 3600 : 0)) % 24;
      const h = rate > 86400 ? (sweep = ((sweep < 0 ? exact : sweep) + dt * 24) % 24) : (sweep = exact);
      const a = Math.PI * (1 - (h - 6) / 12);
      // Dial geometry in CSS px: the 96×44 viewBox drawn at 72×34 (scale .75): centre (36, 29), radius 30; discs 6 px.
      // Positions go through --ax/--ay under a constant inline transform: rewriting an inline transform every frame
      // makes Chrome's style recalc slower with each write until the next major GC.
      if (!lastSun) for (const d of [el.sun, el.moon]) d.style.transform = 'translate3d(var(--ax,0px),var(--ay,0px),0)';
      const x = (t: number) => `${(33 + Math.cos(t) * 30).toFixed(1)}px`, y = (t: number) => `${(26 - Math.sin(t) * 30).toFixed(1)}px`;
      const sx = x(a), sy = y(a), mx = x(a + Math.PI), my = y(a + Math.PI);
      if (sx + sy !== lastSun) { lastSun = sx + sy; el.sun.style.setProperty('--ax', sx); el.sun.style.setProperty('--ay', sy); }
      if (mx + my !== lastMoon) { lastMoon = mx + my; el.moon.style.setProperty('--ax', mx); el.moon.style.setProperty('--ay', my); }
    },
    update() {
      const w = ctx.world(), env = w.environment;
      const alive = w.chimps.reduce((n, c) => n + (c.alive ? 1 : 0), 0);
      set(el.alive, String(alive)); set(el.births, String(w.stats?.births ?? w.births)); set(el.deaths, String(w.stats?.deaths ?? w.deaths));
      set(el.day, `Day ${w.day}`); set(el.time, hhmm(w.hour));
      set(el.date, calendar(env.dayOfYear)); set(el.season, `${env.season === 'wet' ? 'Wet' : 'Dry'} season`);
      // Moon phase: a crescent shadow on the disc (0 new, .5 full); the disc itself moves in frame().
      const lit = 1 - Math.abs(env.moonPhase - 0.5) * 2, dx = Math.round((1 - lit) * 6) * (env.moonPhase < 0.5 ? -1 : 1);
      if (dx !== moonDx) { moonDx = dx; el.moon.style.setProperty('--moon-dx', `${dx}px`); }
      const h = w.hour;
      attr(podTime, 'data-phase', env.daylight < 0.1 ? 'night' : env.daylight < 0.8 ? (h < 12 ? 'dawn' : 'dusk') : 'day');
      const wi = weatherIcon(env);
      if (wi !== lastIcon) { el.wxicon.innerHTML = icon(wi); lastIcon = wi; }
      set(el.temp, `${env.temperature.toFixed(1)}°C`);
      set(el.wxword, env.weather === 'storm' ? 'Storm' : env.weather === 'rain' ? rainWord(env.rain) : env.weather === 'cloudy' ? 'Overcast' : env.daylight < 0.1 ? 'Clear night' : 'Clear');
      set(el.rain, `${Math.round(env.rain * 100)}%`); set(el.wind, windWord(env.wind));
      soundButton.update();
      // Clock control: play state, the chosen preset and what the clock actually achieves.
      const clk = ctx.deps.clock, st = !clk.playing ? 'paused' : clk.blockedByModel ? 'blocked' : clk.limited ? 'limited' : 'ok';
      if (clk.playing !== playing) { playing = clk.playing; el.play.innerHTML = icon(playing ? 'pause' : 'play'); attr(el.play, 'aria-label', playing ? 'Pause (Space)' : 'Play (Space)'); }
      const pre = ctx.deps.speedPresets.find(p => p.id === clk.speedId);
      set(el.speed, pre ? presetLabel(pre.ecoSecondsPerSecond, pre.label) : clk.speedId);
      set(el.achieved, st === 'paused' ? 'Paused' : st === 'blocked' ? 'Waiting on model' : `${formatRate(clk.effectiveRate)}${st === 'limited' ? ' · capped' : ''}`);
      attr(clockCtl, 'data-state', st);
      if (persist) {
        const ps = persist.status(), ind = saveIndicator(ps);
        set(simName, ps.simId ? ps.simName : 'Unsaved world');
        attr(saveInd, 'data-tone', ind.tone); set(saveText, ind.text); attr(saveInd, 'title', ind.title);
        attr(saveInd, 'aria-label', ind.text);
      }
    },
  };
}
