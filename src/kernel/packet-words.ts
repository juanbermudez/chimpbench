import type { Action, BodyPercept, Candidate, DecisionContext, OptionValue } from '../types';

// Stage R2 (docs/staging/r2-prereg.md §3): the v4 wording of the state a kernel sees, registered there before this file
// was written. A word first wherever the number has no meaning to a reader; a number stays only with a unit a reader
// knows (kcal, kcal an hour, metres, hours, %). The degree words are the packet's own drive words (server/decide.ts
// `intensity`: mild >= 0.4, moderate >= 0.55, strong >= 0.7, severe >= 0.88): stage M2 found the small model follows
// those and ignores bare numbers. Every threshold here is a design assumption about wording, not about chimpanzees.
// Pure text functions over the context: no simulation import, so the server (which builds the model's text) and the
// harnesses can both call them. Until server/decide.ts calls them (prereg §6), scripts/lib/packet-v4.ts composes the text.

const degree = (v: number) => v >= 0.88 ? 'severe' : v >= 0.7 ? 'strong' : v >= 0.55 ? 'moderate' : 'mild';
const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const kcal = (v: number) => thousands(Math.abs(v) >= 1000 ? Math.round(v / 100) * 100 : Math.round(v / 10) * 10);
const ago = (h: number) => h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : h < 36 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`;
const metres = (d: number) => `${d < 10 ? Math.max(1, Math.round(d)) : Math.round(d / 5) * 5} m`;

/** The parts of the v4 body line, by the field group each belongs to (the groups of the plan's ablation, plus water and heat). */
export function bodyPartsV4(b: BodyPercept): { group: FieldGroup; text: string }[] {
  const p: { group: FieldGroup; text: string }[] = [];
  if (b.reserves !== undefined) {
    const r = b.reserves, n = Math.round(Math.abs(r) * 100);
    const word = r <= -0.5 ? 'nearly gone' : r <= -0.25 ? 'badly run down' : r <= -0.10 ? 'run down' : r <= -0.03 ? 'a little low' : r < 0.03 ? 'at my usual store' : 'above my usual store';
    p.push({ group: 'energy', text: `body reserves ${word}${r <= -0.03 ? ` (${n}% below)` : r >= 0.03 ? ` (${n}% above)` : ''}` });
  }
  if (b.deficit !== undefined) {
    const d = b.deficit;
    if (b.needKcal !== undefined && b.needKcal <= 0) p.push({ group: 'energy', text: 'no energy shortfall: enough eaten for today' });
    else {
      const word = d >= 0.4 ? `${degree(d)} energy shortfall` : d >= 0.15 ? 'slight energy shortfall' : 'no energy shortfall';
      const h = b.awakeH, awake = h === undefined ? '' : h >= 8 ? ', most of the waking day left' : h >= 3 ? ', some hours of waking left' : h >= 0.5 ? ', little waking time left' : ', about to sleep';
      p.push({ group: 'energy', text: b.needKcal !== undefined ? `${word}: about ${kcal(b.needKcal)} kcal still to find${awake}` : word });
    }
  }
  if (b.gutFill !== undefined) {
    const g = b.gutFill, k = b.hindFill ?? 0;
    const word = g >= 0.9 ? 'stomach full' : g >= 0.6 ? 'stomach mostly full' : g >= 0.3 ? 'stomach half full' : g >= 0.1 ? 'stomach nearly empty' : 'stomach empty';
    p.push({ group: 'gut', text: word + (k >= 0.9 ? ', gut behind it full, so more food cannot pass yet' : k >= 0.6 ? ', gut behind it filling' : '') });
  }
  if (b.waterDeficitPct !== undefined) { const w = b.waterDeficitPct; p.push({ group: 'water-heat', text: w >= 2 ? 'badly short of water' : w >= 1 ? 'short of water' : w >= 0.3 ? 'a little short of water' : 'well watered' }); }
  if (b.heat !== undefined) { const t = b.heat; p.push({ group: 'water-heat', text: t >= 0.4 ? 'hot' : t >= 0.05 ? 'warm' : t <= -0.4 ? 'cold' : t <= -0.05 ? 'chilled' : 'comfortable temperature' }); }
  if (b.sleepiness !== undefined || b.sleepPressure !== undefined) {
    const z = b.sleepiness ?? b.sleepPressure!, S = b.sleepPressure;
    const word = z >= 0.4 ? `${degree(z)} sleepiness` : z >= 0.15 ? 'slightly sleepy' : 'wide awake';
    p.push({ group: 'sleep', text: word + (S === undefined ? '' : S >= 0.7 ? ', long awake' : S <= 0.3 ? ', well slept' : '') });
  }
  if (b.clock !== undefined) p.push({ group: 'sleep', text: b.clock >= 0.6 ? 'body clock at its daytime high' : b.clock <= -0.6 ? 'body clock at its night low' : b.clockRising ? 'body clock rising toward day' : 'body clock falling toward night' });
  if (b.stress !== undefined || b.arousal !== undefined || b.affiliation !== undefined || b.acute !== undefined) {
    const s = [(b.stress ?? 0) >= 0.7 ? 'stress load high' : (b.stress ?? 0) >= 0.4 ? 'stress load raised' : '',
      (b.arousal ?? 0) >= 0.6 ? 'ready to contest' : (b.arousal ?? 0) >= 0.3 ? 'competitive arousal raised' : '',
      (b.affiliation ?? 0) >= 0.6 ? 'strongly drawn to companions' : (b.affiliation ?? 0) >= 0.3 ? 'drawn to companions' : '',
      (b.acute ?? 0) >= 0.5 ? 'heart racing' : (b.acute ?? 0) >= 0.15 ? 'on edge' : ''].filter(Boolean);
    p.push({ group: 'arousal', text: s.length ? s.join(', ') : 'settled' });
  }
  return p;
}

/** The v4 body line. */
export const bodyWordsV4 = (b: BodyPercept): string => bodyPartsV4(b).map(x => x.text).join('; ');

/**
 * An option's v4 value words. `reason`: the option's own text (a distance it already names is not repeated); `social`:
 * the target is an individual on the state's nearby list (its distance is there); `action`: the option's act (the
 * company on a nest is the nest-mates').
 */
export function valueWordsV4(v: OptionValue, reason: string, social: boolean, action: Action): string {
  const p: string[] = [];
  if (v.kcalH !== undefined || v.share !== undefined) {
    const gain = (v.kcalH ?? 0) > 0, q = v.share;
    const word = !gain ? 'no gain after the walk' : q === undefined ? '' : q >= 0.75 ? 'a rich feed' : q >= 0.45 ? 'a good feed' : q >= 0.2 ? 'a modest feed' : 'a poor feed';
    p.push(gain && v.kcalH !== undefined ? `${word ? `${word} (` : ''}about ${kcal(v.kcalH)} kcal an hour net${word ? ')' : ''}` : word);
  }
  if (v.cropKcal !== undefined) {
    if (v.seenH === 0) p.push(`${kcal(v.cropKcal)} kcal of fruit there`);
    else if (v.seenH !== undefined && v.seenH < 0) {
      const c = v.chance;
      p.push(c === undefined ? `${kcal(v.cropKcal)} kcal of fruit expected there, not seen myself`
        : `not seen myself, ${c >= 0.75 ? 'probably in fruit' : c >= 0.4 ? 'may be in fruit' : 'unlikely to be in fruit'} (about ${kcal(v.cropKcal)} kcal if so)`);
    } else {
      const r = v.spreadKcal !== undefined && v.cropKcal > 0 ? v.spreadKcal / v.cropKcal : 0;
      p.push(`${kcal(v.cropKcal)} kcal of fruit there when I saw it ${ago(v.seenH ?? 0)}${r < 0.2 ? '' : r < 0.6 ? ', may have changed' : ', uncertain by now'}`);
    }
  }
  if (v.feeders && v.seenH !== 0) p.push(`${v.feeders} other${v.feeders === 1 ? '' : 's'} going there`);
  if (v.company !== undefined) {
    const c = v.company;
    if (action === 'nest') { if (c > 0.05) p.push('nest-mates beside me'); }
    else p.push(c >= 0.6 ? 'much better company than here' : c >= 0.3 ? 'better company than here' : c > 0.05 ? 'a little more company' : 'no more company than here');
  }
  if (v.odds !== undefined) { const q = v.odds; p.push(q >= 0.75 ? 'I would likely win' : q >= 0.55 ? 'I would probably win' : q >= 0.45 ? 'an even contest' : q >= 0.25 ? 'I would probably lose' : 'I would likely lose'); }
  if (v.distM !== undefined && !social && !/\d+ m\b/.test(reason)) p.push(`${metres(v.distM)} away`);
  return p.filter(Boolean).join('; ');
}

// ---------------------------------------------------------------------------------------------------------------------
// Field groups (the plan's ablation: energy, gut, sleep and phase, arousal and slow states, the belief behind an option)
// ---------------------------------------------------------------------------------------------------------------------

export type FieldGroup = 'energy' | 'gut' | 'sleep' | 'arousal' | 'water-heat' | 'belief';
export const FIELD_GROUPS: Record<FieldGroup, { label: string; body: (keyof BodyPercept)[]; value: (keyof OptionValue)[] }> = {
  energy: { label: 'energy', body: ['reserves', 'deficit', 'needKcal', 'awakeH', 'feedDrive', 'fullKcalH'], value: ['kcalH', 'share'] },
  gut: { label: 'gut', body: ['gutFill', 'hindFill'], value: [] },
  sleep: { label: 'sleep and phase', body: ['sleepPressure', 'sleepiness', 'clock', 'clockRising'], value: [] },
  arousal: { label: 'arousal and slow states', body: ['stress', 'arousal', 'affiliation', 'acute'], value: [] },
  'water-heat': { label: 'water and heat', body: ['waterDeficitPct', 'heat'], value: [] },
  belief: { label: 'the belief behind an option', body: [], value: ['cropKcal', 'seenH', 'feeders', 'distM', 'company', 'chance', 'spreadKcal', 'swingLow', 'swingHigh', 'odds'] },
};

/** The context without one field group (an ablation): the same decision point, the same options, that group's fields removed. */
export function withoutGroup(ctx: DecisionContext, group: FieldGroup): DecisionContext {
  const g = FIELD_GROUPS[group], body = ctx.body ? { ...ctx.body } : undefined;
  if (body) for (const k of g.body) delete body[k];
  const candidates = ctx.candidates.map((c): Candidate => {
    if (!c.value || !g.value.some(k => c.value![k] !== undefined)) return c;
    const value = { ...c.value };
    for (const k of g.value) delete value[k];
    const { value: _drop, ...rest } = c;
    return Object.keys(value).length ? { ...rest, value } : rest;
  });
  return { ...ctx, ...(body ? { body } : {}), candidates };
}
