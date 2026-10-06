import type { Ctx } from './app';
import type { InterventionKind } from '../types';
import { icon } from './icons';
import { morph } from './morph';
import { duration, esc, troopOf, troopShort } from './format';

// Field experiments: named after the published protocols they imitate. The
// target is the selected chimp's party (or community / habitat for global ones).

export const EXPERIMENTS: { kind: InterventionKind; label: string; ic: string; line: string; cite?: string; scope: 'party' | 'community' | 'habitat' }[] = [
  { kind: 'playback-stranger', label: 'Stranger pant-hoot playback', ic: 'speaker', scope: 'party', line: 'A hidden speaker plays an unfamiliar male’s pant-hoot near the party. Do they approach, call back, or retreat?', cite: 'Wilson, Hauser & Wrangham 2001' },
  { kind: 'snake-model', label: 'Snake model', ic: 'snake', scope: 'party', line: 'A model viper on the party’s route. Watch alarm calls and who warns whom.', cite: 'Crockford et al. 2012' },
  { kind: 'colobus-troop', label: 'Colobus troop arrives', ic: 'monkey', scope: 'party', line: 'A red colobus group moves into the canopy nearby — a hunting opportunity for males.', cite: 'Watts & Mitani 2002' },
  { kind: 'fig-mast', label: 'Fig mast', ic: 'fig', scope: 'party', line: 'A large fig crop ripens at once. Big food patches pull parties together.' },
  { kind: 'storm', label: 'Storm', ic: 'storm', scope: 'habitat', line: 'Force a heavy rainstorm now: sheltering, rain displays, foraging halts.' },
  { kind: 'drought', label: 'Drought', ic: 'drought', scope: 'habitat', line: 'Several days of fruit scarcity. Parties shrink as feeding competition rises.' },
  { kind: 'remove-alpha', label: 'Remove the alpha', ic: 'noAlpha', scope: 'community', line: 'The alpha male disappears. Watch the ladder destabilise and coalitions form.' },
];

export function createExperiments(root: HTMLElement, ctx: Ctx) {
  root.innerHTML = `<header class="dock-head"><div><h2>Field experiments</h2><p>Perturb the forest the way field studies do, then watch the next decision.</p></div><button class="icon-btn" data-act="close" aria-label="Close experiments (Esc)">${icon('close')}</button></header>
  <div class="exp-target"></div>
  <div class="exp-note"></div>
  <ul class="exp-list">${EXPERIMENTS.map(x => `<li><button class="exp" data-kind="${x.kind}"><span class="exp-ic">${icon(x.ic)}</span><span class="exp-txt"><b>${x.label}</b><span>${x.line}</span>${x.cite ? `<i>After ${x.cite}</i>` : ''}</span><span class="exp-scope" title="${x.scope === 'party' ? 'Placed near the selected chimp’s party' : x.scope === 'community' ? 'Acts on the selected chimp’s community' : 'Acts on the whole habitat'}">${x.scope}</span></button></li>`).join('')}</ul>
  <div class="exp-active"></div>
  <p class="honest">Interventions are simulated analogues of field protocols; responses come from the simulation rules and, for model-controlled chimps, from the selected provider. After firing, the Mind tab of the most affected model-controlled chimp opens.</p>`;
  const target = root.querySelector<HTMLElement>('.exp-target')!, note = root.querySelector<HTMLElement>('.exp-note')!, active = root.querySelector<HTMLElement>('.exp-active')!;
  root.addEventListener('click', e => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-act="close"]')) { ctx.setDock(null); return; }
    if (el.closest('[data-act="async"]')) { ctx.deps.setPolicy('async'); ctx.refresh(); return; }
    if (el.closest('[data-act="pick"]')) { ctx.setPicking(!ctx.state.picking); return; }
    const tt = el.closest<HTMLElement>('[data-target-troop]');
    if (tt) { const id = anchorOf(Number(tt.dataset.targetTroop)); if (id >= 0) ctx.select(id, { focus: true }); return; }
    const b = el.closest<HTMLElement>('[data-kind]'); if (b) ctx.fireExperiment(b.dataset.kind as InterventionKind);
  });
  /** A community's natural target: its alpha, else the oldest adult in its largest party. */
  function anchorOf(troopId: number): number {
    const w = ctx.world(), t = troopOf(w, troopId); if (!t) return -1;
    if (t.alphaId >= 0 && w.chimps.some(c => c.id === t.alphaId && c.alive)) return t.alphaId;
    const party = w.parties.filter(p => p.troopId === troopId).sort((a, b) => b.members.length - a.members.length)[0];
    const pool = w.chimps.filter(c => c.alive && c.troopId === troopId && (!party || party.members.includes(c.id)) && c.stage !== 'infant').sort((a, b) => b.age - a.age);
    return pool[0]?.id ?? -1;
  }
  let key = '';
  return {
    update() {
      const w = ctx.world(), c = ctx.selected(), t = c ? troopOf(w, c.troopId) : undefined;
      const party = c ? w.parties.find(p => p.id === c.partyId) : undefined;
      const picking = ctx.state.picking;
      const k = [c?.id, c?.partyId, party?.members.length, picking, w.troops.map(tt => tt.id + tt.color).join(), w.modelPolicy.mode, w.stimuli.map(s => `${s.id}:${Math.ceil((s.end - w.time) * 4)}`).join(',')].join('|');
      if (k === key) return; key = k;
      // Target = the selected chimp's party (party experiments) and community (community experiments). The
      // community buttons re-aim at that community's alpha; "Pick on map" arms the next click on any chimp.
      morph(target, `<div class="et-row"><span class="eyebrow">Target</span><span class="seg et-troops" role="radiogroup" aria-label="Target community">${w.troops.map(tt => `<button type="button" role="radio" data-target-troop="${tt.id}" aria-checked="${tt.id === t?.id}" style="--c:${esc(tt.color)}"><i class="tdot"></i>${esc(troopShort(tt))}</button>`).join('')}</span></div>
        <div class="et-row et-who">${c && t ? `<span>Party of <b>${party?.members.length ?? 1}</b> around <b>${esc(c.name)}</b></span>` : '<span class="muted">No chimp selected</span>'}<button type="button" class="btn et-pick" data-act="pick" aria-pressed="${picking}">${icon('target')}${picking ? 'Picking…' : 'Pick on map'}</button></div>
        ${picking ? '<p class="et-hint">Click any chimp in the forest or on the range map. Esc cancels.</p>' : ''}`);
      morph(note, w.modelPolicy.mode === 'off' ? `<p class="warn-note">${icon('info')}The model is off, so only the rules will respond. <button class="lnk" data-act="async">Turn on Async</button></p>` : '');
      morph(active, w.stimuli.length ? `<h3 class="eyebrow">Active stimuli</h3><ul>${w.stimuli.map(s => { const tt = troopOf(w, s.troopId); return `<li>${icon(EXPERIMENTS.find(x => x.kind === s.kind)?.ic ?? 'flask')}<span>${esc(s.label)}${tt ? ` · ${esc(troopShort(tt))}` : ''}</span><span class="mono muted">${s.end > w.time ? `${duration(s.end - w.time)} left` : 'ending'}</span></li>`; }).join('')}</ul>` : '');
      root.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b => { b.disabled = !c && EXPERIMENTS.find(x => x.kind === b.dataset.kind)?.scope !== 'habitat'; });
    },
  };
}
