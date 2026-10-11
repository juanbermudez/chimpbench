import type { Ctx } from './app';
import type { Chimp, SocialPercept, World } from '../types';
import type { DecisionTraceView } from './contracts';
import { icon } from './icons';
import { actionLabel, actionVerb, cap, esc, hhmm, pct, RELATION_LABEL, relationClass, stamp } from './format';
import { alphaBadge, bar, empty } from './parts';
import { cardFromChimp, cardFromTrace, modelEngine, targetName, traceIsCurrent, type DecisionCard, type OptionRow } from './mind-card';

// Mind tab: the decision made visible, for any animal (stage W4). First the decision: the pick over its runners-up
// in one line, who chose, and the reason sentence in print. Then the options it weighed, each with its value as a
// small bar and its reason as text. For an animal the decision loop has a trace for, the trace's details follow (the
// loop step by step, the exact percept, cost) and a history of past decisions; for every other animal the card is
// built live from the animal's own candidates and reason (mind-card.ts) and headed "Rules": the rules' own valuation.
// The header carries a compact switch that hands this chimp to the model (the demo's per-chimp control); the model's
// readiness lives in the time menu under the clock and in the model panel (M).

export { targetName };

export const tracesFor = (ctx: Ctx, id: number) => ctx.deps.decider.traces.filter(t => t.chimpId === id);

function pickLabel(world: World, tr: DecisionTraceView, i: number) {
  const o = tr.options[i]; if (!o) return '—';
  const tn = targetName(world, o, tr);
  return `${actionLabel(o.action)}${tn ? ` <i>→ ${esc(tn)}</i>` : ''}`;
}

const rowLabel = (r: OptionRow) => `${actionLabel(r.action)}${r.target ? ` <i>→ ${esc(r.target)}</i>` : ''}`;
const rowValue = (r: OptionRow, by: DecisionCard['by']) => by === 'probability' ? `${((r.probability ?? 0) * 100).toFixed(0)}%` : r.score.toFixed(2);
/** Why the act under way can sit below another option on the live list: the rules' own policy (src/sim/rg.ts) keeps an
 * act while nothing salient changes and otherwise, for an animal old enough, draws among the options with odds set by
 * their scores. The interface cannot tell which of the two happened, so the note names both. */
const BEATEN_NOTE = 'Not the best score on this list. The rules do not always take the top score: they can keep an act under way, and a fresh choice can be a draw weighted by the scores.';

/** The decision in one line: the pick over its runners-up, each with the chooser's own value, then the reason in print. */
function decisionLine(card: DecisionCard): string {
  const alt = card.over.map(r => `<span class="dl-alt">${rowLabel(r)} <em class="mono">${rowValue(r, card.by)}</em></span>`).join('');
  // "over …" wraps as one group, so the word never hangs at the end of the pick's line.
  const rest = (word: string) => `<span class="dl-rest"><span class="dl-over">${word}</span>${alt}</span>`;
  const head = card.pick ? `<span class="dl-main"><b class="dl-pick">${rowLabel(card.pick)}</b><em class="mono dl-val">${rowValue(card.pick, card.by)}</em></span>${alt ? rest(card.beaten ? 'scored below' : 'over') : ''}`
    : card.waiting ? `<span class="dl-main"><b class="dl-pick">${esc(actionVerb(card.action))}</b></span>${rest('until an answer comes · asked about')}`
    : `<span class="dl-main"><b class="dl-pick">${esc(actionVerb(card.action))}</b></span>${card.offMenu ? '<span class="dl-rest"><span class="dl-over">not among the options weighed</span></span>' : ''}`;
  return `<p class="dline">${head}</p>${card.reason ? `<p class="dwhy">${esc(card.reason)}</p>` : ''}`;
}

/** Every option weighed: its value as a small bar (the rules' score; the model's probability beside it when a model
 * answered) and its reason sentence as text. */
function optionsList(card: DecisionCard): string {
  const model = card.by === 'probability';
  return `<div class="opts ${model ? 'by-model' : 'by-rules one'}" role="table" aria-label="Options weighed">
    <div class="opt head" role="row"><span role="columnheader">Option</span><span role="columnheader" title="The rules’ own score for the option: a simulation weight, uncalibrated">Rules score</span>${model ? '<span role="columnheader" title="The model’s probabilities over the offered options (softmax, uncalibrated)">Model</span>' : ''}</div>
    ${card.options.map(r => `<div class="opt ${r.chosen ? 'chosen' : ''} ${r.rulesPick ? 'rules' : ''}" role="row">
        <span class="opt-name" role="cell"><span class="opt-marks">${r.chosen ? `<i class="mk-model" title="${card.kind === 'live' ? 'Under way' : model ? 'The model’s pick' : 'Chosen by the rules'}">●</i>` : ''}${r.rulesPick && !(r.chosen && !model) ? `<i class="mk-rules" title="${card.kind === 'live' ? 'The rules’ best score' : 'The rules’ pick'}">◆</i>` : ''}</span>${rowLabel(r)}</span>
        <span class="opt-val" role="cell">${bar(r.bar, 'rules')}<b class="mono">${r.score.toFixed(2)}</b></span>
        ${model ? `<span class="opt-val" role="cell">${bar(r.probability ?? 0, 'model')}<b class="mono">${((r.probability ?? 0) * 100).toFixed(0)}%</b></span>` : ''}
        ${r.reason ? `<span class="opt-why" role="cell">${esc(r.reason)}</span>` : ''}
      </div>`).join('')}
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
        <span class="nr-name" role="cell">${s.sex === 'male' ? '♂' : '♀'} ${esc(s.name)}${s.isAlpha ? alphaBadge() : ''}</span>
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
    <li class="st st-pick ${model ? (agree ? 'agree' : 'diverge') : ''}"><span class="st-k" title="${model ? esc(modelEngine(tr.model, tr.provider).label) : 'The rules stood in for the model'}">${model ? 'Model pick' : 'Rules pick'}</span><b class="st-v">${pickLabel(w, tr, tr.choiceIndex)}${p !== undefined ? ` <em class="mono">${(p * 100).toFixed(0)}%</em>` : ''}</b><span class="st-s">${model ? (tr.rulesIndex < 0 ? 'rules pick unknown' : agree ? 'rules agree' : `rules chose ${esc(actionLabel(tr.options[tr.rulesIndex]?.action ?? 'rest').toLowerCase())}`) : 'model did not answer'}</span></li>${arrow}
    <li class="st st-app ${applied.cls}"><span class="st-k">Outcome</span><b class="st-v">${applied.head}</b><span class="st-s">${esc(applied.sub)}${model ? ` · ${Math.round(tr.latencyMs)} ms` : ''}</span></li>
  </ol>`;
}

/** Header chip: who chose, in the plan's names (mind-card.ts Engine). */
const whoChip = (card: DecisionCard) => `<span class="who who-${card.engine.id}" title="${esc(card.engine.note)}">${card.engine.id === 'rules' || card.engine.id === 'rules-stand-in' ? icon('ladder') : card.engine.id === 'none' ? '' : icon('spark')}${esc(card.engine.label)}</span>`;

/** A decision-loop trace: the decision first, the options with their reasons, then the loop's own details. */
export function traceCard(ctx: Ctx, tr: DecisionTraceView, pinned: boolean, control = ''): string {
  const w = ctx.world(), card = cardFromTrace(w, tr), model = tr.source === 'model';
  const agree = tr.choiceIndex >= 0 && tr.choiceIndex === tr.rulesIndex, rules = tr.options[tr.rulesIndex];
  return `<article class="trace ${pinned ? 'pinned' : ''}">
    <header class="trace-head"><h3 class="eyebrow">${pinned ? 'Pinned decision' : 'Latest decision'}</h3><b class="mono">${stamp(w, tr.time)}</b>${whoChip(card)}${control}</header>
    ${decisionLine(card)}
    ${model ? `<p class="dnote ${agree ? '' : 'diverge'}">${tr.rulesIndex < 0 ? 'The rules’ own pick is not on this menu.' : agree ? 'The rules pick the same.' : `The rules would pick ${rules ? `${esc(actionLabel(rules.action).toLowerCase())}${targetName(w, rules, tr) ? ` → ${esc(targetName(w, rules, tr))}` : ''}` : 'another option'}.`}</p>` : `<p class="dnote">${esc(card.engine.note)}</p>`}
    <h4 class="eyebrow opts-title ${model ? '' : 'by-rules'}">Options offered <span class="muted">${card.options.length} · <i class="mk-model">●</i> chosen${model ? ' · <i class="mk-rules">◆</i> rules pick' : ''}</span></h4>
    ${optionsList(card)}
    ${storyStrip(ctx, tr)}
    <p class="trace-cost mono">${model ? `${Math.round(tr.latencyMs)} ms · ${tr.inputTokens} input tokens · ` : ''}${tr.options.length} options · v${tr.context.version}</p>
    <details class="ctx-wrap" data-keep="ctx"><summary>${icon('eye')}What ${esc(tr.chimpName)} perceived <span class="muted">the packet the loop built for the model</span></summary>${contextHtml(w, tr)}</details>
  </article>`;
}

/**
 * The live card: an animal with no trace to show. What it is doing and why, then the options it weighed at its last
 * decision point with the rules' own scores, read from the animal itself (Chimp.candidates, Chimp.reason).
 */
export function liveCard(ctx: Ctx, c: Chimp, control = ''): string {
  const w = ctx.world(), d = ctx.deps.decider, card = cardFromChimp(w, c, modelEngine(d.model, d.provider));
  // No running clock here (the strip beside the tab carries "· 31 min" live): the card redraws only when the animal's
  // decision count, act or option list changes.
  return `<article class="trace live">
    <header class="trace-head"><h3 class="eyebrow">Now</h3><b class="mono">since ${stamp(w, card.time)}</b>${whoChip(card)}${control}</header>
    ${decisionLine(card)}
    ${card.beaten && card.kind === 'live' ? `<p class="dnote">${BEATEN_NOTE}</p>` : card.offMenu || card.waiting ? `<p class="dnote">${esc(card.engine.note)}</p>` : ''}
    ${card.options.length ? `<h4 class="eyebrow opts-title by-rules">${card.waiting ? 'Options on the table' : 'Options weighed'} <span class="muted">${card.options.length} at its last decision point${card.pick ? ' · <i class="mk-model">●</i> under way' : ''}</span></h4>
    ${optionsList(card)}` : '<p class="subtle">No options on record yet: it has not reached a decision point since the simulation began.</p>'}
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
  // The latest trace is the first view only while it describes the act under way; once the animal has moved on (the
  // rules decided since, or it was never asked) the live card is, and the traces stay in the history.
  const latest = traces.at(-1), current = latest && (!c.alive || traceIsCurrent(w, c, latest)) ? latest : undefined;
  const shown = pinned ?? current;
  const inflight = d.inflightChimpId === c.id;
  const waiting = c.awaitingDecisionSince !== null && c.awaitingDecisionSince !== undefined;
  // One word of live state beside the switch, only while the model has this chimp (readiness in full: time menu, M).
  const note = !controlled || !c.alive ? '' : !d.ready ? (d.phase === 'loading' ? 'loading' : 'offline') : inflight ? '<span class="pulse">deciding</span>' : waiting ? '<span class="pulse">waiting</span>' : '';
  const engine = modelEngine(d.model, d.provider).label;
  const control = `<label class="mctl" title="${controlled ? `${esc(engine)}: the model picks among the options the rules list for this chimp` : `Let the model pick among the options the rules list for this chimp (${esc(engine.toLowerCase())})`}"><span>Model${note ? ` <i>· ${note}</i>` : ''}</span><span class="switch sm"><input type="checkbox" role="switch" data-act="control" ${controlled ? 'checked' : ''} ${c.alive ? '' : 'disabled'} aria-label="Model decides for ${esc(c.name)}"><span class="sw"></span></span></label>`;
  return `<div class="mind">
    ${shiftCard(ctx, c, traces)}
    ${shown ? traceCard(ctx, shown, !!pinned, control) : c.alive ? liveCard(ctx, c, control) : `<header class="trace-head"><h3 class="eyebrow">Latest decision</h3><span class="muted">none</span>${control}</header>${empty('No decision on record', `${esc(c.name)} has died; nothing is weighed any more.`, 'brain')}`}
    ${traces.length ? `<section class="history"><div class="sec-head"><h3 class="eyebrow">History <span class="muted">${traces.length} decision${traces.length === 1 ? '' : 's'} through the loop</span></h3>${pinned ? '<button class="link-btn" data-act="follow">Back to now</button>' : ''}</div>
      <ol>${[...traces].reverse().slice(0, 40).map(t => {
        const agree = t.choiceIndex === t.rulesIndex;
        return `<li><button class="h-row ${t === shown ? 'on' : ''}" data-trace="${esc(t.id)}" aria-pressed="${t === shown}">
          <span class="mono">${stamp(w, t.time).replace(/^D\d+ /, '')}</span>
          <span class="h-pick"><b>${esc(actionLabel(t.options[t.choiceIndex]?.action ?? 'rest'))}</b>${t.source === 'model' && !agree && t.rulesIndex >= 0 ? `<i>rules: ${esc(actionLabel(t.options[t.rulesIndex]?.action ?? 'rest'))}</i>` : ''}</span>
          <span class="h-flag ${t.source !== 'model' ? 'fb' : agree ? 'same' : 'diff'}" title="${t.source !== 'model' ? 'The rules stood in' : agree ? 'Agrees with the rules' : 'Diverges from the rules'}"></span>
          <span class="mono muted">${t.source === 'model' ? `${Math.round(t.latencyMs)}ms` : 'rules'}</span></button></li>`;
      }).join('')}</ol></section>` : ''}
    <p class="honest">Rules scores are the simulation’s own weights for each option, with a small tie-breaking jitter. Model probabilities are softmax scores over the offered options. Neither is calibrated to chimpanzee behavior. The options and their sentences are written by the rules, whoever picks.</p>
  </div>`;
}

export function mindKey(ctx: Ctx, c: Chimp): string {
  const d = ctx.deps.decider, traces = tracesFor(ctx, c.id), last = traces.at(-1), w = ctx.world();
  // The live card reads the animal itself: its decision count, act, reason and option list. No clock term: nothing in
  // the tab counts time, so it redraws only when one of these changes.
  return [c.id, c.controller, c.alive, w.modelPolicy.mode, d.ready, d.phase, d.roster, traces.length, last?.id, last?.applied, ctx.state.pinnedTraceId,
    ctx.state.experiment?.time, c.awaitingDecisionSince === null ? '-' : Math.floor((w.time - c.awaitingDecisionSince) * 60), d.inflightChimpId === c.id,
    c.decisionVersion, c.action, c.targetId, c.reason, c.candidates?.length ?? 0, c.candidates?.[0]?.score ?? '', c.decisionSource].join('|');
}
