import type { Ctx } from './app';
import type { Candidate, Chimp, SocialPercept, World } from '../types';
import type { DecisionTraceView } from './contracts';
import { icon } from './icons';
import { actionLabel, ago, cap, esc, hhmm, pct, RELATION_LABEL, relationClass, stamp } from './format';
import { bar, empty } from './parts';

// Mind tab: the decision loop made visible. The exact percept the model saw, options with model probabilities beside
// rules scores, the pick, agreement, cost, and a scrollable history of past decisions. The latest-decision header
// carries a compact switch that hands this chimp to the model (the demo's per-chimp control); the model's readiness
// lives in the time menu under the clock and in the model panel (M).

export function targetName(world: World, cand: Candidate, trace?: DecisionTraceView): string {
  if (cand.targetId < 0) return '';
  const seen = trace?.context.social.find(s => s.id === cand.targetId);
  if (seen) return seen.name;
  const c = world.chimps.find(x => x.id === cand.targetId); if (c) return c.name;
  const t = world.trees.find(x => x.id === cand.targetId); if (t) return t.common || t.species;
  if (world.water.some(x => x.id === cand.targetId)) return 'water';
  const p = world.prey.find(x => x.id === cand.targetId); if (p) return p.species;
  return '';
}

export const tracesFor = (ctx: Ctx, id: number) => ctx.deps.decider.traces.filter(t => t.chimpId === id);

function pickLabel(world: World, tr: DecisionTraceView, i: number) {
  const o = tr.options[i]; if (!o) return '—';
  const tn = targetName(world, o, tr);
  return `${actionLabel(o.action)}${tn ? ` <i>→ ${esc(tn)}</i>` : ''}`;
}

function optionsTable(world: World, tr: DecisionTraceView): string {
  const maxScore = Math.max(1e-6, ...tr.options.map(o => o.score));
  const hasProb = tr.probabilities.length === tr.options.length && tr.source === 'model';
  const order = tr.options.map((_, i) => i).sort((a, b) => hasProb ? tr.probabilities[b] - tr.probabilities[a] : tr.options[b].score - tr.options[a].score);
  return `<div class="opts ${hasProb ? 'by-model' : 'by-rules'}" role="table" aria-label="Options offered to the model">
    <div class="opt head" role="row"><span role="columnheader">Option</span><span role="columnheader" title="Simulation utility weight (uncalibrated)">Rules</span><span role="columnheader" title="Model probabilities over the offered options (uncalibrated)">Model</span></div>
    ${order.map(i => {
      const o = tr.options[i], chosen = i === tr.choiceIndex, rules = i === tr.rulesIndex, p = hasProb ? tr.probabilities[i] : NaN;
      return `<div class="opt ${chosen ? 'chosen' : ''} ${rules ? 'rules' : ''}" role="row" title="${esc(o.reason)}">
        <span class="opt-name" role="cell"><span class="opt-marks">${chosen ? `<i class="mk-model" title="${hasProb ? 'Model’s pick' : 'Chosen by the rules fallback'}">●</i>` : ''}${rules ? `<i class="mk-rules" title="Rules' pick">◆</i>` : ''}</span>${pickLabel(world, tr, i)}</span>
        <span class="opt-val" role="cell">${bar(o.score / maxScore, 'rules')}<b class="mono">${o.score.toFixed(2)}</b></span>
        <span class="opt-val" role="cell">${hasProb ? `${bar(p, 'model')}<b class="mono">${(p * 100).toFixed(0)}%</b>` : '<b class="mono muted">—</b>'}</span>
      </div>`;
    }).join('')}
  </div>`;
}

function contextHtml(world: World, tr: DecisionTraceView): string {
  const cx = tr.context, f = cx.focal, e = cx.environment;
  const body: [string, number][] = [['Hunger', f.hunger], ['Thirst', f.thirst], ['Energy', f.energy], ['Social', f.social], ['Stress', f.stress], ['Health', f.health]];
  if (f.injury > 0.01) body.push(['Injury', f.injury]);
  const facts = [
    `${hhmm(e.hour)} · ${e.phase}`, `${cap(e.weather)}${e.rain > 0.03 ? ` ${pct(e.rain)}%` : ''}`, `${e.temperature.toFixed(0)} °C`, `fruit nearby ${pct(e.fruitNearby)}%`,
    `party ${e.partySize}${e.partyAdultMales ? ` (${e.partyAdultMales} ad. ♂)` : ''}`,
    ...(e.nearTerritoryEdge ? ['<b class="warn">near range edge</b>'] : []),
    ...(e.strangersSeen ? [`<b class="alert">${e.strangersSeen} strangers seen</b>`] : []),
    ...(e.strangersHeard ? [`<b class="alert">${e.strangersHeard} strangers heard</b>`] : []),
    ...(f.swelling > 0.5 ? [`swelling ${pct(f.swelling)}%`] : []), ...(f.carryingMeat > 0 ? ['holding meat'] : []), ...(f.hasDependentInfant ? ['dependent infant'] : []),
  ];
  return `<div class="ctx">
    <div class="ctx-sec"><h4 class="eyebrow">Body</h4><div class="ctx-body">${body.map(([l, v]) => `<span class="cb ${l === 'Stress' || l === 'Injury' ? 'neg' : ''}"><i>${l}</i>${bar(v)}<b class="mono">${pct(v)}</b></span>`).join('')}</div>
      <p class="ctx-line">${esc(f.name)} · ${f.isAlpha ? 'alpha' : f.rankOrder ? `rank ${f.rankOrder}/${f.rankOf}` : 'unranked'} · ${f.mood} · currently ${esc(f.currentAction)}</p></div>
    <div class="ctx-sec"><h4 class="eyebrow">Situation</h4><p class="facts">${facts.map(x => `<span>${x}</span>`).join('')}</p></div>
    ${cx.stimuli.length ? `<div class="ctx-sec stim"><h4 class="eyebrow">Perceived stimuli</h4><ul>${cx.stimuli.map(s => `<li>${icon('flask')}${esc(s)}</li>`).join('')}</ul></div>` : ''}
    <div class="ctx-sec"><h4 class="eyebrow">Nearby · ${cx.social.length} perceived</h4>${cx.social.length ? `<div class="near" role="table">${cx.social.map(s => `<button class="near-row" role="row" data-select="${s.id}" ${world.chimps.some(c => c.id === s.id) ? '' : 'disabled'}>
        <span class="nr-name" role="cell">${s.sex === 'male' ? '♂' : '♀'} ${esc(s.name)}${s.isAlpha ? ` ${icon('crown')}` : ''}</span>
        <span role="cell"><span class="rel ${relationClass(s.relation)}">${RELATION_LABEL[s.relation]}</span></span>
        <span class="mono" role="cell">${s.rankOrder ? `#${s.rankOrder}` : '—'}</span>
        <span class="mono" role="cell">${s.distance < 10 ? s.distance.toFixed(1) : Math.round(s.distance)} m</span>
        <span class="nr-act" role="cell">${esc(s.action)}${s.injured ? ' · hurt' : ''}${s.hasMeat ? ' · meat' : ''}${s.swelling > 0.7 ? ' · swollen' : ''}</span>
      </button>`).join('')}</div>` : '<p class="subtle">No one in view.</p>'}</div>
    ${cx.recent.length ? `<div class="ctx-sec"><h4 class="eyebrow">Recent memories</h4><ol class="mem">${cx.recent.map(r => `<li>${esc(r)}</li>`).join('')}</ol></div>` : ''}
  </div>`;
}

const distText = (m: number) => `${m < 10 ? m.toFixed(1) : Math.round(m)} m`;

/** Ranks what the chimp perceived by how much it plausibly bears on this decision; returns the top three as short phrases. */
export function sawFacts(tr: DecisionTraceView): string[] {
  const cx = tr.context, e = cx.environment, f = cx.focal, facts: { s: number; t: string }[] = [];
  cx.stimuli.forEach((st, i) => facts.push({ s: 10 - i * 0.1, t: st }));
  if (e.strangersSeen) facts.push({ s: 9.5, t: `${e.strangersSeen} stranger${e.strangersSeen > 1 ? 's' : ''} seen` });
  if (e.strangersHeard) facts.push({ s: 9, t: `${e.strangersHeard} stranger${e.strangersHeard > 1 ? 's' : ''} heard` });
  const qual = (p: SocialPercept) => p.sex === 'female' && p.swelling > 0.7 ? 'swollen' : p.hasMeat ? 'meat-holding' : p.injured ? 'injured' : p.isAlpha ? 'alpha' : p.relation === 'community' ? '' : RELATION_LABEL[p.relation].toLowerCase();
  const person = (p: SocialPercept) => `${qual(p)} ${p.name} ${distText(p.distance)}`.trim();
  const seen = new Set<number>();
  for (const [idx, score] of [[tr.choiceIndex, 8], [tr.rulesIndex, 7.5]] as const) {
    const p = cx.social.find(x => x.id === tr.options[idx]?.targetId);
    if (p && !seen.has(p.id)) { seen.add(p.id); facts.push({ s: score, t: person(p) }); }
  }
  const close = [...cx.social].filter(p => !seen.has(p.id) && (p.relation === 'rival' || p.relation === 'stranger' || (p.sex === 'female' && p.swelling > 0.7)) && p.distance < 15).sort((a, b) => a.distance - b.distance)[0];
  if (close) facts.push({ s: 6.5, t: person(close) });
  if (e.nearTerritoryEdge) facts.push({ s: 6, t: 'at range edge' });
  if (f.injury > 0.2) facts.push({ s: 5.8, t: `own injury ${pct(f.injury)}` });
  if (f.hunger > 0.7) facts.push({ s: 5.5, t: `hungry ${pct(f.hunger)}` });
  if (f.thirst > 0.7) facts.push({ s: 5.4, t: `thirsty ${pct(f.thirst)}` });
  if (f.energy < 0.25) facts.push({ s: 5.3, t: `tired ${pct(f.energy)}` });
  if (f.carryingMeat > 0) facts.push({ s: 5, t: 'holding meat' });
  if (e.fruitNearby > 0.6) facts.push({ s: 4, t: `fruit nearby ${pct(e.fruitNearby)}%` });
  facts.push({ s: 3, t: `${e.weather === 'clear' ? (e.phase === 'night' ? 'night' : 'clear') : e.weather}${e.rain > 0.05 ? ` ${pct(e.rain)}%` : ''} ${hhmm(e.hour)}` });
  facts.push({ s: 2, t: `party of ${e.partySize}` });
  return facts.sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.t);
}

/** SAW → OPTIONS → PICK → OUTCOME: the whole loop in one glance. */
function storyStrip(ctx: Ctx, tr: DecisionTraceView): string {
  const w = ctx.world(), model = tr.source === 'model';
  const agree = tr.choiceIndex >= 0 && tr.choiceIndex === tr.rulesIndex;
  const p = model ? tr.probabilities[tr.choiceIndex] : undefined;
  const top = tr.options.map((o, i) => ({ o, v: model && tr.probabilities.length === tr.options.length ? tr.probabilities[i] : o.score })).sort((a, b) => b.v - a.v).slice(0, 3).map(x => actionLabel(x.o.action).toLowerCase());
  const applied = !model ? { cls: 'fb', head: 'Rules fallback', sub: tr.discardedReason || (tr.applied ? 'applied by rules' : 'not applied') }
    : tr.applied ? (tr.note ? { cls: 'rev', head: 'Applied · revalidated', sub: tr.note } : { cls: 'ok', head: 'Applied fresh', sub: 'same state the model saw' })
    : { cls: 'bad', head: 'Discarded', sub: tr.discardedReason || 'stale or illegal' };
  const arrow = `<li class="st-arrow" aria-hidden="true">${icon('chevronR')}</li>`;
  return `<ol class="story" aria-label="Decision loop, step by step">
    <li class="st st-saw"><span class="st-k">Saw</span><span class="saw">${sawFacts(tr).map(f => `<b>${esc(f)}</b>`).join('')}</span></li>
    <li class="st"><span class="st-k">Options</span><b class="st-v">${tr.options.length}</b><span class="st-s">${esc(top.join(' · '))}</span></li>${arrow}
    <li class="st st-pick ${model ? (agree ? 'agree' : 'diverge') : ''}"><span class="st-k">${model ? 'Model pick' : 'Rules pick'}</span><b class="st-v">${pickLabel(w, tr, tr.choiceIndex)}${p !== undefined ? ` <em class="mono">${(p * 100).toFixed(0)}%</em>` : ''}</b><span class="st-s">${model ? (tr.rulesIndex < 0 ? 'rules pick unknown' : agree ? 'rules agree' : `rules chose ${esc(actionLabel(tr.options[tr.rulesIndex]?.action ?? 'rest').toLowerCase())}`) : 'model did not answer'}</span></li>${arrow}
    <li class="st st-app ${applied.cls}"><span class="st-k">Outcome</span><b class="st-v">${applied.head}</b><span class="st-s">${esc(applied.sub)}${model ? ` · ${Math.round(tr.latencyMs)} ms` : ''}</span></li>
  </ol>`;
}

export function traceCard(ctx: Ctx, tr: DecisionTraceView, pinned: boolean, control = ''): string {
  const w = ctx.world();
  return `<article class="trace ${pinned ? 'pinned' : ''}">
    <header class="trace-head"><h3 class="eyebrow">${pinned ? 'Pinned decision' : 'Latest decision'}</h3><b class="mono">${stamp(w, tr.time)}</b><span class="muted">${ago(w, tr.time)}</span>${control}</header>
    ${storyStrip(ctx, tr)}
    <h4 class="eyebrow opts-title">Options offered <span class="muted"><i class="mk-model">●</i> chosen · <i class="mk-rules">◆</i> rules pick</span></h4>
    ${optionsTable(w, tr)}
    <p class="trace-cost mono">${tr.source === 'model' ? `${Math.round(tr.latencyMs)} ms · ${tr.inputTokens} input tokens · ` : ''}${tr.options.length} options · v${tr.context.version}</p>
    <details class="ctx-wrap" data-keep="ctx"><summary>${icon('eye')}What ${esc(tr.chimpName)} perceived <span class="muted">the model’s entire input</span></summary>${contextHtml(w, tr)}</details>
  </article>`;
}

function shiftCard(ctx: Ctx, c: Chimp, traces: DecisionTraceView[]): string {
  const m = ctx.state.experiment; if (!m || m.chimpId !== c.id) return '';
  const w = ctx.world();
  // "After" is the first trace recorded after the pre-experiment trace, never that trace itself (same-tick timestamps are common).
  const bi = m.beforeTraceId ? traces.findIndex(t => t.id === m.beforeTraceId) : -1;
  const before = bi >= 0 ? traces[bi] : undefined;
  const after = bi >= 0 ? traces[bi + 1] : traces.find(t => m.beforeTraceId ? t.time > m.time : t.time >= m.time);
  const lbl = (t?: DecisionTraceView) => t ? `${pickLabel(w, t, t.choiceIndex)}${t.probabilities[t.choiceIndex] !== undefined && t.source === 'model' ? ` <span class="mono">${(t.probabilities[t.choiceIndex] * 100).toFixed(0)}%</span>` : ''}` : '<span class="muted">no decision yet</span>';
  const changed = before && after && before.options[before.choiceIndex]?.action !== after.options[after.choiceIndex]?.action;
  return `<section class="shift ${after ? (changed ? 'changed' : 'held') : 'waiting'}" aria-live="polite">
    <header>${icon('flask')}<span><b>${esc(m.label)}</b><i class="mono">Fired ${stamp(w, m.time)}</i></span><button class="icon-btn sm" data-act="clear-exp" aria-label="Dismiss experiment card">${icon('close')}</button></header>
    <div class="shift-row"><div><span class="eyebrow">Before</span><b>${lbl(before)}</b></div><span class="shift-arrow">${icon('chevronR')}</span><div><span class="eyebrow">After</span><b>${after ? lbl(after) : '<span class="pulse">Awaiting the next decision point…</span>'}</b></div></div>
    ${after ? `<p class="subtle">${changed ? `The choice changed after the perturbation (${after.source === 'model' ? 'model' : 'rules fallback'}).` : `Same choice after the perturbation (${after.source === 'model' ? 'model' : 'rules fallback'}).`} Compare the percept below with the earlier trace in History.</p>` : ''}
  </section>`;
}

export function mindHtml(ctx: Ctx, c: Chimp): string {
  const w = ctx.world(), d = ctx.deps.decider, mode = w.modelPolicy.mode;
  const controlled = c.controller === 'model' && mode !== 'off';
  const traces = tracesFor(ctx, c.id);
  const pinned = ctx.state.pinnedTraceId ? traces.find(t => t.id === ctx.state.pinnedTraceId) : undefined;
  const shown = pinned ?? traces.at(-1);
  const inflight = d.inflightChimpId === c.id;
  const waiting = c.awaitingDecisionSince !== null && c.awaitingDecisionSince !== undefined;
  // One word of live state beside the switch, only while the model has this chimp (readiness in full: time menu, M).
  const note = !controlled || !c.alive ? '' : !d.ready ? (d.phase === 'loading' ? 'loading' : 'offline') : inflight ? '<span class="pulse">deciding</span>' : waiting ? '<span class="pulse">waiting</span>' : '';
  const control = `<label class="mctl" title="${controlled ? 'The decision model chooses this chimp’s actions' : 'Let the decision model choose this chimp’s actions'}"><span>Model${note ? ` <i>· ${note}</i>` : ''}</span><span class="switch sm"><input type="checkbox" role="switch" data-act="control" ${controlled ? 'checked' : ''} ${c.alive ? '' : 'disabled'} aria-label="Model decides for ${esc(c.name)}"><span class="sw"></span></span></label>`;
  return `<div class="mind">
    ${shiftCard(ctx, c, traces)}
    ${shown ? traceCard(ctx, shown, !!pinned, control) : `<header class="trace-head"><h3 class="eyebrow">Latest decision</h3><span class="muted">none yet</span>${control}</header>${empty('No decisions recorded yet', controlled ? 'The model is consulted at decision points: when an action ends, a need crosses a threshold, or something new is perceived. Traces appear here.' : 'Switch Model on to watch the decision model choose for this chimp. The rule baseline keeps running for everyone else.', 'brain')}`}
    ${traces.length ? `<section class="history"><div class="sec-head"><h3 class="eyebrow">History <span class="muted">${traces.length} decision${traces.length === 1 ? '' : 's'}</span></h3>${pinned ? '<button class="link-btn" data-act="follow">Follow latest</button>' : ''}</div>
      <ol>${[...traces].reverse().slice(0, 40).map(t => {
        const agree = t.choiceIndex === t.rulesIndex;
        return `<li><button class="h-row ${t === shown ? 'on' : ''}" data-trace="${esc(t.id)}" aria-pressed="${t === shown}">
          <span class="mono">${stamp(w, t.time).replace(/^D\d+ /, '')}</span>
          <span class="h-pick"><b>${esc(actionLabel(t.options[t.choiceIndex]?.action ?? 'rest'))}</b>${t.source === 'model' && !agree && t.rulesIndex >= 0 ? `<i>rules: ${esc(actionLabel(t.options[t.rulesIndex]?.action ?? 'rest'))}</i>` : ''}</span>
          <span class="h-flag ${t.source !== 'model' ? 'fb' : agree ? 'same' : 'diff'}" title="${t.source !== 'model' ? 'Rules fallback' : agree ? 'Agrees with rules' : 'Diverges from rules'}"></span>
          <span class="mono muted">${t.source === 'model' ? `${Math.round(t.latencyMs)}ms` : 'rules'}</span></button></li>`;
      }).join('')}</ol></section>` : ''}
    <p class="honest">Model probabilities are softmax scores over the offered options; rules scores are simulation weights. Neither is calibrated to chimpanzee behavior.</p>
  </div>`;
}

export function mindKey(ctx: Ctx, c: Chimp): string {
  const d = ctx.deps.decider, traces = tracesFor(ctx, c.id), last = traces.at(-1);
  return [c.id, c.controller, c.alive, ctx.world().modelPolicy.mode, d.ready, d.phase, d.roster, traces.length, last?.id, last?.applied, ctx.state.pinnedTraceId,
    ctx.state.experiment?.time, c.awaitingDecisionSince === null ? '-' : Math.floor((ctx.world().time - c.awaitingDecisionSince) * 60), d.inflightChimpId === c.id].join('|');
}
