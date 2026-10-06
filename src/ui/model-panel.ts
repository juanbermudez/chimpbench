import type { Ctx } from './app';
import type { ModelPolicy } from '../types';
import type { Roster } from './contracts';
import { icon } from './icons';
import { morph } from './morph';
import { esc, nameOf } from './format';
import { modelChipState } from './hud';
import { PROVIDERS, type ProviderId } from '../providers/types';

// Decision model (right sidebar, M): policy, roster, readiness and honest statistics.

const POLICIES: { id: ModelPolicy['mode']; label: string; line: string }[] = [
  { id: 'off', label: 'Off', line: 'Rules decide for every chimp. No model calls.' },
  { id: 'async', label: 'Async', line: 'The provider decides for the roster; if it is late, rules step in after a grace period. The clock never waits.' },
  { id: 'lockstep', label: 'Lockstep', line: 'The clock stops at each model decision point until the provider answers or times out. Slower, but no decision is skipped.' },
];
const ROSTERS: { id: Roster; label: string; line: string }[] = [
  { id: 'selected', label: 'Selected', line: 'Only the selected chimp (the one in the bottom panel).' },
  { id: 'focal-set', label: 'Focal set', line: 'Selected, each alpha, a mother with an infant and a juvenile (≤ 6).' },
  { id: 'all', label: 'All', line: 'Every living chimp. Requests queue; in async, rules fill the gaps.' },
];

const median = (xs: number[]) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export function createModelPanel(root: HTMLElement, ctx: Ctx) {
  root.innerHTML = `<p class="pane-blurb">The selected provider picks one action from the legal options a chimp perceives.</p>
  ${ctx.deps.setProvider ? `<fieldset class="radios"><legend class="eyebrow">Provider</legend>${PROVIDERS.map(p => `<label class="radio"><input type="radio" name="provider" value="${p.id}"><span class="r-dot"></span><span><b>${p.label}</b><i>${p.id === 'browser' ? 'Runs on this device. Load downloads and caches the model (872 MB with FP16; 1.74 GB with FP32).' : p.id === 'server' ? 'Uses the configured GLiNER server endpoint.' : 'Uses the configured gateway; API credentials stay on its server.'}</i></span></label>`).join('')}</fieldset>` : ''}
  <div class="mp-status"></div>
  <div class="mp-stats"></div>
  <fieldset class="radios"><legend class="eyebrow">Policy</legend>${POLICIES.map(p => `<label class="radio"><input type="radio" name="policy" value="${p.id}"><span class="r-dot"></span><span><b>${p.label}</b><i>${p.line}</i></span></label>`).join('')}</fieldset>
  <fieldset class="radios"><legend class="eyebrow">Roster</legend>${ROSTERS.map(p => `<label class="radio"><input type="radio" name="roster" value="${p.id}"><span class="r-dot"></span><span><b>${p.label}</b><i>${p.line}</i></span></label>`).join('')}</fieldset>
  <div class="mp-roster"></div>
  <p class="honest">Model probabilities are softmax scores over the offered options, uncalibrated for chimpanzee behavior. Agreement with rules measures consistency with the simulation’s own heuristics, not biological validity.</p>`;
  const status = root.querySelector<HTMLElement>('.mp-status')!, stats = root.querySelector<HTMLElement>('.mp-stats')!, roster = root.querySelector<HTMLElement>('.mp-roster')!;
  root.addEventListener('click', e => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-act="retry"]')) { void ctx.deps.retryModel().then(() => ctx.refresh()); ctx.refresh(); return; }
    const s = el.closest<HTMLElement>('[data-select]'); if (s) ctx.select(Number(s.dataset.select), { tab: 'mind' });
  });
  root.addEventListener('change', e => {
    const el = e.target as HTMLInputElement;
    if (el.name === 'provider') ctx.deps.setProvider?.(el.value as ProviderId);
    if (el.name === 'policy') ctx.deps.setPolicy(el.value as ModelPolicy['mode']);
    if (el.name === 'roster') ctx.deps.setRoster(el.value as Roster, ctx.state.selectedId);
    ctx.refresh();
  });
  let key = '';
  return {
    update() {
      const d = ctx.deps.decider, w = ctx.world(), mode = w.modelPolicy.mode;
      const model = d.traces.filter(t => t.source === 'model');
      const lat = median(model.slice(-50).map(t => t.latencyMs));
      const tok = model.length ? Math.round(model.slice(-50).reduce((a, t) => a + t.inputTokens, 0) / Math.min(50, model.length)) : NaN;
      const agree = d.agreement.total ? Math.round((d.agreement.same / d.agreement.total) * 100) : NaN;
      const k = [d.provider, d.progress, mode, d.roster, d.ready, d.phase, d.status, d.lastError, d.calls, d.applied, d.revalidated, d.discarded, d.fallbacks, d.waiting, d.agreement.same, d.agreement.total, d.focalIds.join(','), d.device, model.length].join('|');
      if (k === key) return; key = k;
      root.querySelectorAll<HTMLInputElement>('input[name="policy"]').forEach(i => { i.checked = i.value === mode; });
      root.querySelectorAll<HTMLInputElement>('input[name="roster"]').forEach(i => { i.checked = i.value === d.roster; i.disabled = mode === 'off'; });
      root.querySelectorAll<HTMLInputElement>('input[name="provider"]').forEach(i => { i.checked = i.value === d.provider; });
      const chip = modelChipState(ctx);
      morph(status, `<div class="mp-led"><span class="led" data-tone="${chip.tone}"></span><b>${d.ready ? 'Ready' : esc(d.phase || 'unknown')}</b>${d.device ? `<span class="mono muted">${esc(d.device)}</span>` : ''}</div>
        <p>${esc(d.status || '')}</p>${d.lastError ? `<p class="err" title="${esc(d.lastError)}">${esc(/Unexpected token|not valid JSON|Failed to fetch|404/.test(d.lastError) ? 'The configured provider endpoint is unavailable. Rules decide.' : d.lastError)}</p>` : ''}
        <p class="mono muted">${esc(d.model)}</p>
        ${!d.ready ? `<button class="btn" data-act="retry" ${d.phase === 'loading' ? 'disabled' : ''}>${icon('power')}${d.phase === 'loading' ? 'Loading…' : d.provider === 'browser' ? 'Load browser model' : 'Start / retry provider'}</button>` : ''}`);
      const cell = (label: string, v: string, title = '') => `<div${title ? ` title="${esc(title)}"` : ''}><span class="eyebrow">${label}</span><b>${v}</b></div>`;
      const rev = d.revalidated ?? 0;
      morph(stats, cell('Calls', String(d.calls)) + cell('Applied fresh', String(Math.max(0, d.applied - rev)), 'Answers applied to exactly the state the model saw') + cell('Revalidated', String(rev), 'The chimp’s state changed during inference, but the choice was still legal and was applied') + cell('Discarded', String(d.discarded), 'Stale or illegal answers the engine rejected') + cell('Fallbacks', String(d.fallbacks ?? '—'), 'Model-controlled decisions made by rules (timeouts, errors)')
        + cell('Agreement', Number.isFinite(agree) ? `${agree}%` : '—', `Model choice equals the rules' pick in ${d.agreement.same} of ${d.agreement.total}`)
        + cell('Latency', Number.isFinite(lat) ? `${Math.round(lat)} ms` : '—', 'Median over the last 50 model decisions') + cell('Input tokens', Number.isFinite(tok) ? String(tok) : '—', 'Mean input tokens per request, last 50') + cell('Waiting', String(d.waiting ?? '—'), 'Model-controlled chimps at a decision point now'));
      morph(roster, d.focalIds.length && mode !== 'off' ? `<h3 class="eyebrow">Model-controlled now <span class="muted">${d.focalIds.length}</span></h3><div class="ally-row">${d.focalIds.slice(0, 24).map(id => `<button class="pal" data-select="${id}">${icon('spark')}${esc(nameOf(w, id))}</button>`).join('')}${d.focalIds.length > 24 ? `<span class="muted">+${d.focalIds.length - 24}</span>` : ''}</div>` : '');
    },
  };
}
