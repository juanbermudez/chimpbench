// The yardstick row of the page "How close to the wild" (stage V1, docs/staging/v1-field.md): one comparison mark
// everywhere. The field band is a soft blue bar in the target's own units; the reference runs are a hollow grey ring
// (with its interval as a whisker when the scorer gives one); this world's exact record is an ink square, filled with
// its interval, hollow when it has none ("no interval for one world"). Rows scored in parts get one line and one mark
// per part. No colour says pass or fail: the words do, and they never say pass or fail either. HTML strings only; the
// page morphs them in.

import type { LiteSource, LiteTarget, RefArm } from '../yardstick/bundle';
import { bandText, dateWords, fmtValue, patternWords, sig2, wideBand, type Distance } from '../yardstick/words';
import { bandsOf, type Mark, type RefState, type WorldState } from '../yardstick/view';
import { SAME_DEFINITION } from '../yardstick/same';
import type { OpenBand } from '../yardstick/band-distance';
import { esc } from './format';

const W = 360;          // strip width in its own units (the SVG scales down with the cell)
const PAD = 10;
const EVIDENCE: Record<string, string> = { H: 'strong evidence', M: 'moderate evidence', L: 'weak evidence' };
export const roleWords = (t: LiteTarget) => (t.role === 'held-out' ? 'held out' : 'fitted');
const CHIP_FLAGS = ['compromised', 'tuned', 'heldAsFail', 'notScorable', 'contested', 'encoded', 'partiallyEncoded', 'revisedPostFreeze'];

/** The value range a strip shows: the band, the marks and their intervals, padded; far marks are held at the edge. */
function domainOf(band: OpenBand, marks: Mark[]): [number, number] {
  const lo = band.lo, hi = band.hi;
  let a: number, b: number;
  if (lo !== null && hi !== null) {
    const w = Math.max(hi - lo, Math.abs(hi) * 0.05, 1e-6);
    a = lo - w * 0.9; b = hi + w * 0.9;
    for (const m of marks) for (const v of [m.value, ...(m.interval ?? [])]) { a = Math.min(a, Math.max(v, lo - w * 4)); b = Math.max(b, Math.min(v, hi + w * 4)); }
    const pad = (b - a) * 0.04; return [a - pad, b + pad];
  }
  const e = (lo ?? hi)!, s = Math.max(Math.abs(e), 1e-6);
  a = e - s * 0.8; b = e + s * 0.8;
  for (const m of marks) for (const v of [m.value, ...(m.interval ?? [])]) { a = Math.min(a, Math.max(v, e - s * 5)); b = Math.max(b, Math.min(v, e + s * 5)); }
  const pad = (b - a) * 0.05; return [a - pad, b + pad];
}

/** One strip line: band, its edge labels, the reference ring and this world's square. */
function stripLine(y: number, band: OpenBand, ref: Mark | undefined, mine: Mark | undefined, x0: number, x1: number, labels: boolean): string {
  const [a, b] = domainOf(band, [ref, mine].filter((m): m is Mark => !!m));
  const X = (v: number) => x0 + (Math.max(a, Math.min(b, v)) - a) / (b - a) * (x1 - x0);
  const out = (v: number) => v < a || v > b;
  const bl = band.lo !== null ? X(band.lo) : x0, br = band.hi !== null ? X(band.hi) : x1;
  let s = `<line class="ys-axis" x1="${x0}" x2="${x1}" y1="${y}" y2="${y}"/>`;
  const openL = band.lo === null, openR = band.hi === null;
  s += `<rect class="ys-band${openL ? ' open-l' : ''}${openR ? ' open-r' : ''}" x="${bl.toFixed(1)}" y="${y - 5}" width="${Math.max(2, br - bl).toFixed(1)}" height="10" rx="5"/>`;
  if (openL || openR) s += `<rect class="ys-fade-${openL ? 'l' : 'r'}" x="${(openL ? x0 : br - 24).toFixed(1)}" y="${y - 5}" width="24" height="10"/>`;
  if (labels) {
    const t = (x: number, v: number, anchor: string) => `<text class="ys-edge" x="${x.toFixed(1)}" y="${y + 17}" text-anchor="${anchor}">${esc(String(v))}</text>`;
    if (band.lo !== null && band.hi !== null && br - bl < 34) s += `<text class="ys-edge" x="${((bl + br) / 2).toFixed(1)}" y="${y + 17}" text-anchor="middle">${esc(bandText(band))}</text>`;
    else { if (band.lo !== null) s += t(bl, band.lo, band.hi === null ? 'start' : 'middle'); if (band.hi !== null) s += t(br, band.hi, band.lo === null ? 'end' : 'middle'); }
  }
  const whisker = (m: Mark, cls: string, dy: number) => (m.interval ? `<line class="${cls}" x1="${X(m.interval[0]).toFixed(1)}" x2="${X(m.interval[1]).toFixed(1)}" y1="${y + dy}" y2="${y + dy}"/>` : '');
  const arrow = (m: Mark, dy: number) => {
    if (!out(m.value)) return '';
    const left = m.value < a, x = left ? x0 + 1 : x1 - 1;
    return `<path class="ys-arrow" d="M${x} ${y + dy} l${left ? 5 : -5} -3.5 v7 Z"/><text class="ys-far" x="${left ? x + 8 : x - 8}" y="${y + dy - 6}" text-anchor="${left ? 'start' : 'end'}">${esc(fmtValue(m.value, m.interval))}</text>`;
  };
  if (ref) {
    s += whisker(ref, 'ys-wr', -2);
    s += out(ref.value) ? arrow(ref, -2) : `<circle class="ys-ring" cx="${X(ref.value).toFixed(1)}" cy="${y - 2}" r="4"/>`;
  }
  if (mine) {
    s += whisker(mine, 'ys-ww', 3);
    s += out(mine.value) ? arrow(mine, 3) : `<rect class="ys-sq${mine.interval ? '' : ' hollow'}" x="${(X(mine.value) - 3).toFixed(1)}" y="${y}" width="6" height="6"/>`;
  }
  return s;
}

/** The strip of a row: one line, or one line per part with the part's name and band at its left. */
export function stripSvg(t: LiteTarget, ref: Mark[], mine: Mark[]): string {
  const bands = bandsOf(t);
  if (!bands.length) return `<svg class="ys-strip" viewBox="0 0 ${W} 36" aria-hidden="true"><text class="ys-none" x="${W / 2}" y="21" text-anchor="middle">a pattern, no number to place</text></svg>`;
  if (bands.length === 1) return `<svg class="ys-strip" viewBox="0 0 ${W} 36" aria-hidden="true">${stripLine(14, bands[0].band, ref[0], mine[0], PAD, W - PAD, true)}</svg>`;
  const lines = bands.map((b, i) => {
    const y = 10 + i * 17;
    return `<text class="ys-part" x="0" y="${y + 3.5}">${esc(b.part!)} ${esc(bandText(b.band))}</text>${stripLine(y, b.band, ref.find(m => m.part === b.part), mine.find(m => m.part === b.part), 96, W - PAD, false)}`;
  }).join('');
  return `<svg class="ys-strip" viewBox="0 0 ${W} ${12 + bands.length * 17}" aria-hidden="true">${lines}</svg>`;
}

const distWords = (d: Distance | null) => (d ? d.words : '');
/** The distance in the row's short line ("inside the band", "0.6 band widths above", "too close to call"). */
const shortDist = (d: Distance | null) => (d ? d.words.replace('inside the field band', 'inside the band') : '');
const markWords = (m: Mark) => `${m.part ? `${m.part} ` : ''}${fmtValue(m.value, m.interval)}${m.interval ? ` (${fmtValue(m.interval[0], m.interval)}–${fmtValue(m.interval[1], m.interval)})` : ''}`;

/** Caveats every reference value of a row carries. */
export function refCaveats(t: LiteTarget, arm: RefArm, st: RefState): string[] {
  const c: string[] = [];
  if (st.kind === 'marks') {
    const alone = st.row.perSeed.filter(v => v !== null && v !== undefined).length;
    if (st.row.perSeed.length && alone < st.row.perSeed.length) c.push(`pooled from the ${arm.seeds.length} worlds together: ${alone} of ${st.row.perSeed.length} give a value on their own`);
    if (t.id === 'T-DEM-2') c.push('pooled, not a life expectancy');
    if (t.id === 'T-DEM-3') c.push('pooled, not a survival curve');
  }
  if ((st.kind === 'marks' || st.kind === 'pattern') && st.row.flags.includes('instrument below bar')) c.push('shown, not scored: the field teams’ detector is below its bar');
  if (!arm.protocol.current) c.push('older protocol');
  return c;
}

/** A pattern row's reference result in a few words (the scorer's note is in the detail). */
function patternLine(note: string, verdict: string): string {
  if (/^\d+\/\d+ seeds show the pattern/.test(note)) return patternWords(note);
  if (note.startsWith('simulation-truth row: no readout')) return 'no readout in these runs';
  if (verdict === 'n/a' || verdict === 'not scorable') return 'not measured in these runs';
  if (verdict === 'insufficient') return 'not enough data in these runs';
  return note || 'no value';
}
/** "perMaleFollowWeek" → "per male follow week": the scorer's part names in words. */
const partWords = (k: string) => k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();

/** The two words lines of a row: the reference runs, then this world. Short; the detail has the long words. */
function refLine(st: RefState, t: LiteTarget, arm: RefArm): string {
  const glyph = '<i class="g-ring" aria-hidden="true"></i>';
  const tail = (st.kind === 'marks' || st.kind === 'pattern') && st.row.flags.includes('instrument below bar') ? ' · shown, not scored' : '';
  if (st.kind === 'marks') {
    const v = st.marks.length > 1 ? st.marks.map(m => markWords(m)).join(' · ') : `${markWords(st.marks[0])} · ${shortDist(st.marks[0].dist)}`;
    return `${glyph}reference ${esc(v)}${tail}`;
  }
  if (st.kind === 'pattern') return `${glyph}reference: ${esc(patternLine(st.row.note, st.row.verdict))}${tail}`;
  if (st.kind === 'never') return `<i class="g-cross" aria-hidden="true"></i>reported, never counted`;
  if (st.kind === 'input') return `<span class="g-none" aria-hidden="true"></span>an input, not a test`;
  if (st.kind === 'recount') return `${glyph}reference: needs a recount`;
  if (t.window.kind === 'scenario') return `${glyph}reference: a scenario row, not in these runs`;
  // reported by the scorer but not scored (too few range cells): its value in words, never a mark on the band
  if (st.kind === 'none' && st.row?.verdict === 'scale') return `${glyph}reference ${st.row.pooled === null ? '' : `${esc(fmtValue(st.row.pooled))} · `}not scored: one range cell moves it`;
  return `${glyph}reference: ${esc(st.kind === 'none' && st.row ? patternLine(st.row.note, st.row.verdict) : 'no value')}`;
}
function worldLine(ws: WorldState): string {
  if (ws.kind === 'marks') {
    const v = ws.marks.length > 1 ? ws.marks.map(m => markWords(m)).join(' · ') : `${markWords(ws.marks[0])} · ${shortDist(ws.marks[0].dist)}`;
    const hollow = ws.marks.some(m => !m.interval);
    return `<i class="g-sq${hollow ? ' hollow' : ''}" aria-hidden="true"></i>this world ${esc(v)}${hollow ? ' · no interval for one world' : ''}`;
  }
  if (ws.kind === 'waiting') return `<i class="g-sq hollow" aria-hidden="true"></i>this world: ${esc(ws.words)}`;
  return `<span class="g-none" aria-hidden="true"></span>this world: ${esc(ws.words)}`;
}

export interface RowView { t: LiteTarget; arm: RefArm; ref: RefState; world: WorldState; communities: string; open: boolean; detail: string;
  /** How the reference arm's match with this world is worded (today's model: from the defaults and golden-world check). */
  matchNote?: string }

/** A row: a <details> whose summary is the 44 px yardstick and whose body is the detail (rendered only while open). */
export function rowHtml(v: RowView): string {
  const { t, ref, world } = v;
  const chips = t.flags.filter(f => CHIP_FLAGS.includes(f.key)).map(f => `<span class="ys-chip f-${f.key}">${esc(f.label.replace(/:.*/, ''))}</span>`);
  const wide = bandsOf(t).map(b => wideBand(b.band)).find(Boolean);
  if (wide) chips.push('<span class="ys-chip f-wide">wide band</span>');
  if (t.truth) chips.push('<span class="ys-chip f-truth">read from the simulation</span>');
  const refMarks = ref.kind === 'marks' ? ref.marks : [], myMarks = world.kind === 'marks' ? world.marks : [];
  const strip = ref.kind === 'never' ? `<svg class="ys-strip" viewBox="0 0 ${W} 36" aria-hidden="true">${bandsOf(t).length ? stripLine(14, bandsOf(t)[0].band, undefined, undefined, PAD, W - PAD, true) : ''}<path class="ys-x" d="M${W / 2 - 4} 6 l8 8 M${W / 2 + 4} 6 l-8 8"/></svg>` : stripSvg(t, refMarks, myMarks);
  const lineR = refLine(ref, t, v.arm), lineW = worldLine(world);
  const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, '’').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const aria = `${t.metric}, ${roleWords(t)}. Field band ${bandsOf(t).map(b => `${b.part ? `${b.part} ` : ''}${bandText(b.band)}`).join(', ') || 'a pattern'} ${t.accept.units}. ${plain(lineR)}. ${plain(lineW)}.`;
  // The tuned sentence and the community sizes beside a scaled band stand on the row itself, not behind a click.
  const notes: string[] = [];
  if (t.tunedLine) notes.push(`<span class="ys-note">${esc(t.tunedLine)}</span>`);
  if (t.scaled && v.communities) notes.push(`<span class="ys-note">The band is ${esc(t.scaled.words)}. ${esc(v.communities)}</span>`);
  // Reference values pooled across worlds that give none on their own (life history above all) say so on the row.
  const pooled = refCaveats(t, v.arm, ref).filter(c => c.startsWith('pooled'));
  if (pooled.length) notes.push(`<span class="ys-note">Reference ${esc(pooled.join('; '))}.</span>`);
  return `<details class="ys-row${ref.kind === 'never' ? ' never' : ''}" data-row="${esc(t.id)}" data-keep="${esc(t.id)}"${v.open ? ' open' : ''}>
    <summary class="ys-sum" aria-label="${esc(aria)}">
      <span class="ys-name"><b>${esc(t.metric)}</b><span class="ys-chips"><span class="ys-chip role-${t.role}">${roleWords(t)}</span>${chips.slice(0, 3).join('')}${chips.length > 3 ? `<span class="ys-chip more">+${chips.length - 3}</span>` : ''}</span></span>
      <span class="ys-mid">${strip}</span>
      <span class="ys-txt"><span class="ys-l">${lineR}</span><span class="ys-l">${lineW}</span></span>${notes.join('')}
    </summary>
    <div class="ys-detail">${v.open ? v.detail : ''}</div>
  </details>`;
}

const srcWords = (key: string, sources: Record<string, LiteSource>) => {
  const s = sources[key];
  if (!s) return esc(key);
  const lead = s.authors.split(/,\s*/)[0].replace(/\s+\S+$/, '') || s.authors;
  const etal = /,/.test(s.authors) ? ' et al.' : '';
  return `${esc(lead)}${etal} ${esc(String(s.year))}${s.doi ? ` · <a href="https://doi.org/${esc(s.doi)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>, <i>${esc(s.journal)}</i>` : `, ${esc(s.title)}, <i>${esc(s.journal)}</i>`}`;
};

/** The row's detail: what is measured, the wild, this world, the reference runs, and every flag with its reason. */
export function detailHtml(v: RowView, sources: Record<string, LiteSource>, arms: RefArm[], matching: Set<string>): string {
  const { t, arm, ref, world } = v;
  const bands = bandsOf(t);
  const wide = bands.map(b => wideBand(b.band)).filter(Boolean);
  const flags = t.flags.map(f => `<li><b>${esc(f.label)}</b> ${esc(f.reason)}</li>`).join('');
  const field = t.field.map(f => `<li><b>${esc(f.population)}</b>${f.years ? ` · ${esc(f.years)}` : ''} · ${esc(f.value)}${f.n ? ` · n ${esc(f.n)}` : ''}${f.method ? ` · ${esc(f.method)}` : ''}<span class="ys-src">${f.source.split(/[;,]\s*/).map(k => srcWords(k, sources)).join('; ')}</span>${f.note ? `<span class="ys-src">${esc(f.note)}</span>` : ''}</li>`).join('');
  const bandLine = bands.length ? bands.map(b => `${b.part ? `${esc(b.part)} ` : ''}${esc(bandText(b.band))}`).join(', ') + ` ${esc(t.accept.units)}` : `a pattern: ${esc(t.accept.basis)}`;
  const seed = (x: number | null, i: number) => `world ${arm.seeds[i] ?? i + 1}: ${x === null || x === undefined ? '—' : esc(fmtValue(x))}`;
  let refBlock: string;
  if (ref.kind === 'marks' || ref.kind === 'pattern' || (ref.kind === 'none' && ref.row)) {
    const row = ref.kind === 'none' ? ref.row! : ref.row;
    const dists = ref.kind === 'marks' ? `<p class="ys-sub">${esc(ref.marks.map(m => `${m.part ? `${m.part}: ` : ''}${distWords(m.dist)}`).join('; '))}.</p>` : '';
    refBlock = `${dists}<p>${row.pooled !== null ? `Pooled ${esc(fmtValue(row.pooled, row.interval))}${row.interval ? ` (95% ${esc(fmtValue(row.interval[0], row.interval))}–${esc(fmtValue(row.interval[1], row.interval))})` : ', no interval given'}` : 'No pooled value'} · n ${esc(String(row.n))} · the scorer’s word: ${esc(row.verdict)}${row.note ? ` (${esc(patternWords(row.note))})` : ''}.</p>
      ${row.perSeed.length ? `<p class="ys-sub">${row.perSeed.map(seed).join(' · ')}</p>` : ''}
      ${Object.keys(row.parts).length ? `<p class="ys-sub">Parts: ${Object.entries(row.parts).map(([k, x]) => `${esc(partWords(k))} ${x === null ? '—' : esc(fmtValue(x))}`).join(' · ')}</p>` : ''}
      ${row.truthValue !== null && row.from === 'card' ? `<p class="ys-sub">What happened (simulation truth, not by a field team): ${esc(fmtValue(row.truthValue))}</p>` : ''}
      ${refCaveats(t, arm, ref).length ? `<p class="ys-sub">${esc(refCaveats(t, arm, ref).join(' · '))}</p>` : ''}`;
  } else refBlock = `<p>${esc(ref.why)}</p>`;
  if (ref.kind === 'none' && ref.row?.verdict === 'scale') refBlock = `<p class="ys-sub">${esc(ref.why)}.</p>${refBlock}`;
  const others = arms.filter(a => a.id !== arm.id).map(a => {
    const r = a.rows[t.id], p = r?.pooled;
    return `<li>${esc(a.name)}${matching.has(a.id) ? '' : ' · <em>another model, for context only</em>'}: ${a.recount[t.id] ? 'needs a recount' : p === null || p === undefined ? 'no pooled value' : esc(fmtValue(p, r.interval))}${!a.protocol.current ? ' · older protocol' : ''}</li>`;
  }).join('');
  const seen = world.kind === 'marks' || world.kind === 'waiting' ? world.seen : null;
  return `<div class="ys-d">
    <p class="ys-head"><span class="mono">${esc(t.id)}</span> · ${t.role === 'held-out' ? 'held out: never used to set anything' : 'fitted: settings were chosen with published values like this in view, so agreement is expected, not a test'} · ${esc(EVIDENCE[t.evidence] ?? t.evidence)}</p>
    ${flags ? `<ul class="ys-flags">${flags}</ul>` : ''}
    <h4>What is measured</h4><p>${esc(t.definition)}</p><p class="ys-sub">The field teams’ method: ${esc(t.method)}, per ${esc(t.unit)}.${t.notMeasured ? ` Not measured in a watched world: ${esc(t.notMeasured)}.` : ''}</p>
    <h4>The wild</h4><p>Field band ${bandLine}.${t.partBands && t.accept.lo === null && t.accept.hi === null ? '' : ` ${esc(t.accept.basis)}.`}${wide.length ? ` <em>${esc(wide.join('; '))}: inside it is easy.</em>` : ''}</p>
    ${t.comparisonBand ? `<p class="ys-sub">With the source’s method corrected: ${esc(String(t.comparisonBand.lo))}–${esc(String(t.comparisonBand.hi))} ${esc(t.comparisonBand.units)} (${esc(t.comparisonBand.basis)}).</p>` : ''}
    ${t.scaled ? `<p class="ys-sub">The band is ${esc(t.scaled.words)}. ${esc(v.communities)}</p>` : ''}
    ${field ? `<ul class="ys-field">${field}</ul>` : ''}
    <h4>This world</h4><p>${worldLine(world)}${world.kind === 'marks' ? ` · ${esc(world.marks.map(m => `${m.part ? `${m.part}: ` : ''}${distWords(m.dist)}`).join('; '))} · ${esc(world.seen.basis)}` : world.kind === 'waiting' && world.seen ? ` · ${esc(world.seen.basis)} so far` : ''}</p>
    ${world.kind !== 'marks' && world.more ? `<p class="ys-sub">${esc(world.more)}</p>` : ''}
    ${SAME_DEFINITION[t.id] ? `<p class="ys-sub">Exact record (all-seeing), not what a field team could see. Same definition as the field’s: ${esc(SAME_DEFINITION[t.id])}</p>` : ''}
    <p class="ys-sub">Shortest window: ${esc(t.window.why)}.</p>
    <h4>Reference runs</h4><p class="ys-sub">${esc(arm.name)}: ${esc(arm.what)}. ${arm.seeds.length} worlds × ${sig2(arm.days / 365)} years after a ${arm.burnInDays}-day settling-in, ${esc(arm.profile)} map, rules only, run ${esc(dateWords(arm.runDate))} (commit ${esc(arm.commit)})${arm.protocol.current ? ', today’s protocol' : ', an older protocol'}.${matching.has(arm.id) ? '' : ' Another model, for context only.'}${v.matchNote ? ` ${esc(v.matchNote)}` : ''}</p>
    ${refBlock}
    ${others ? `<ul class="ys-others">${others}</ul>` : ''}
  </div>`;
}
