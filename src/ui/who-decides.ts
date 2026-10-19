import type { DriveReadout } from '../drive/app';
import type { DriveAnimalView } from './contracts';
import { esc, formatRate, nameOf } from './format';
import type { World } from '../types';

// "Who decides" in the mode "Model decides for every adult" (src/drive; docs/staging/app-model-drives.md): the words
// and numbers the top bar, the time panel, the model panel and the Mind tab show. Every share is of animal-minutes in
// the last simulated hour, by stage R7's ledger categories as R16's meter counts them (src/drive/ledger.ts): a fresh
// model choice, an intention the loop's gate held, the rules. Nothing here rounds a number it then calls exact: the chip
// shows whole percentages that add up to 100, and the minutes beside them are the ledger's own.

/** Whole percentages of the three shares that add up to 100 (largest remainder), or nulls when there is no minute yet. */
export function percents(s: { model: number; held: number; rules: number }): [number, number, number] | null {
  const v = [s.model, s.held, s.rules], sum = v[0] + v[1] + v[2];
  if (!(sum > 0)) return null;
  const raw = v.map(x => (x / sum) * 100), out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  for (const i of raw.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i).map(x => x.i)) { if (left <= 0) break; out[i]++; left--; }
  return [out[0], out[1], out[2]];
}
const mins = (m: number) => `${(Math.round(m * 100) / 100).toLocaleString('en-US')} min`;
const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;

/** The top bar's line: the three shares of the last hour. */
export function chipText(r: DriveReadout): string {
  const p = percents(r.hour);
  return p ? `Model ${p[0]}% · held ${p[1]}% · rules ${p[2]}%` : 'Model decides · no minute yet';
}

/** The last hour in words, exact (the chip's tooltip and the panels). */
export function hourText(r: DriveReadout): string {
  const h = r.hour, of = h.ticks * 0.25;
  if (!h.ticks) return 'No simulated minute has run in this mode since it was opened.';
  return `Last simulated hour (${of < 60 ? `${of} of 60 min so far` : '60 min'}), animal-minutes: a fresh model choice ${mins(h.model)} (${pct1(r.share.model)}), an intention the gate held ${mins(h.held)} (${pct1(r.share.held)}), the rules ${mins(h.rules)} (${pct1(r.share.rules)}: animals under ${r.minAge} ${mins(h.rulesYoung)}, adults ${mins(h.rulesAdult)}).`;
}
export function adultsText(r: DriveReadout): string {
  return `${r.onModel} of ${r.adults} adults on the model; ${r.young} animal${r.young === 1 ? '' : 's'} under ${r.minAge} on the rules.`;
}
export function adapterText(r: DriveReadout): string {
  const a = r.bound ?? r.serving;
  const who = a ? `Adapter ${a.adapter}, weights ${a.sha256.slice(0, 12)}${r.bound ? '' : ' (not yet bound to this world)'}` : 'No adapter yet';
  return `${who}${r.dry ? ' · DRY RUN: a fake scorer that holds no model' : ''} · ${r.result}.`;
}
export function fallbackText(r: DriveReadout): string {
  if (!r.fallbackTotal) return `Decided by the rules for adults on the model: none of ${r.asks} asks.`;
  return `Decided by the rules for adults on the model: ${r.fallbackTotal} of ${r.asks} asks (${r.fallbacks.map(([why, n]) => `${why} ${n}`).join(', ')}).`;
}
/** The achieved speed in words: over how long it was measured. */
export function achievedText(r: DriveReadout, playing: boolean): string {
  if (!playing) return 'paused';
  const a = r.achieved;
  return a.rate === null ? 'being measured' : `${formatRate(a.rate)} over the last ${a.seconds >= 59 ? 'minute' : `${Math.round(a.seconds)} s`} of play`;
}
/** A pass that has run this long (ms) is said in the menu bar: below it the line would flicker at every one-call pass. */
export const LONG_PASS_MS = 1500;
/**
 * The menu bar's achieved slot in the mode: "Paused", the rate over the last minute, or, while a pass has run for
 * LONG_PASS_MS or more (at dawn most adults are asked at once and the world stands still for the whole pass), how far
 * it has come, in the waiting state of the default app's "Waiting on model" (second reading).
 */
export function achievedSlot(r: DriveReadout, playing: boolean, nowMs: number): { text: string; state: 'paused' | 'blocked' | 'drive' } {
  if (!playing) return { text: 'Paused', state: 'paused' };
  const q = r.queue;
  if (q.busy && q.passStarted > 0 && nowMs - q.passStarted >= LONG_PASS_MS) return { text: q.worker ? 'Worker stopped' : `Asking ${q.passAsked} of ${q.passWaiting}`, state: 'blocked' };
  return { text: r.achieved.rate === null ? 'measuring' : formatRate(r.achieved.rate), state: 'drive' };
}
/** The window the readout covers: the last hour, or as much of it as has run in this mode. */
export function spanText(r: DriveReadout): string {
  const of = r.hour.ticks * 0.25;
  return of >= 60 || of === 0 ? 'last hour' : `last ${of} min`;
}
export function queueText(r: DriveReadout, w: World, playing: boolean): string {
  const q = r.queue;
  const now = q.busy && q.worker ? `waiting for the worker (${q.worker}); ${q.asking >= 0 ? nameOf(w, q.asking) : 'this adult'} is asked again once it serves the adapter again, and the rules do not step in`
    : q.busy ? `asking ${q.asking >= 0 ? nameOf(w, q.asking) : '…'}, adult ${Math.max(1, q.passAsked)} of ${q.passWaiting} in this pass (call ${q.passCalls + 1}); the world waits until all have answered`
    : q.waiting ? `${q.waiting} adult${q.waiting === 1 ? '' : 's'} waiting` : 'nobody waiting';
  const per = q.msPerCall !== null ? ` · ${(q.msPerCall / 1000).toFixed(2)} s a call` : '';
  const last = q.lastPass ? ` · last pass ${q.lastPass.asks} ask${q.lastPass.asks === 1 ? '' : 's'}, ${q.lastPass.calls} call${q.lastPass.calls === 1 ? '' : 's'} in ${(q.lastPass.ms / 1000).toFixed(1)} s` : '';
  return `Queue: ${now}${per}${last} · achieved ${achievedText(r, playing)} (the clock waits for every answer).`;
}
/** The chip's tooltip: everything above in plain lines. */
export function whoTitle(r: DriveReadout): string {
  return ['Model decides for every adult', hourText(r), adultsText(r), adapterText(r), fallbackText(r), r.problem ? `Not playing: ${r.problem}` : ''].filter(Boolean).join('\n');
}

/** The block for the time panel and the model panel. */
export function driveBlock(r: DriveReadout, w: World, playing: boolean): string {
  return `<div class="drive-block">
    ${r.dry ? '<p class="drive-dry">Dry run: the answers come from a fake scorer that holds no model.</p>' : ''}
    ${r.problem ? `<p class="drive-problem">${esc(r.problem)}</p>` : ''}
    <p>${esc(hourText(r))}</p>
    <p>${esc(adultsText(r))} Settled by the rules for ${r.burnInDays} day${r.burnInDays === 1 ? '' : 's'} first${r.burnInDays < 30 ? ' (stage R16 uses 30)' : ', as stage R16'}.</p>
    <p>${esc(queueText(r, w, playing))}</p>
    <p>${esc(fallbackText(r))}</p>
    <p class="mono muted" title="${esc(r.resultLong)}">${esc(adapterText(r))}</p>
  </div>`;
}

/** The Mind tab's section for one animal: on the model or on the rules (and why), its own hour, and everyone's. */
export function driveMind(r: DriveReadout, a: DriveAnimalView, name: string): string {
  const h = a.hour, years = Math.floor(a.age);
  const own = h && h.ticks ? `${esc(name)}’s last hour (${h.ticks * 0.25} min): a fresh model choice ${mins(h.model)}, an intention the gate held ${mins(h.held)}, the rules ${mins(h.rules)}.`
    : `${esc(name)} has not lived a minute in this mode since it was opened.`;
  const p = percents(r.hour);
  return `<section class="drive-who ${a.onModel ? 'on' : 'young'}" aria-label="Who decides for ${esc(name)}">
    <p class="dw-head"><b>${a.onModel ? 'On the model' : 'On the rules'}</b><span>${a.onModel ? `aged ${years}: every animal aged ${a.minAge} or over decides through the trained adapter (activity, then target)` : `aged ${years}: animals under ${a.minAge} stay on the rules in this mode`}</span></p>
    <p>${own}</p>
    <p class="muted">Everyone, ${spanText(r)}: ${p ? `model ${p[0]}% · held ${p[1]}% · rules ${p[2]}%` : 'no minute yet'} · ${r.onModel} of ${r.adults} adults on the model · ${esc((r.bound ?? r.serving)?.adapter ?? 'no adapter yet')}${r.dry ? ' (<b class="warn">dry run, no model</b>)' : ''} · ${esc(r.result)}</p>
  </section>`;
}
