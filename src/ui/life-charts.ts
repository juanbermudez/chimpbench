// Charts of one world's exact life record for the page "How close to the wild" (stage V1, docs/staging/v1-field.md,
// part 1b): the population over time, deaths by cause and by age, the life table, and each infant's first years. Inline
// SVG strings sized in their own units (they scale with their box). Colours come from the page's stylesheet: one muted
// hue per cause class, never blue (blue is the field's), never a pass or fail colour. Every chart carries a text
// alternative.

import { BINS, CAUSE_CLASSES, CAUSE_WORDS, type CauseClass, type DeathRow, type InfantRow } from '../yardstick/life';
import { poissonInterval } from '../yardstick/field';
import { esc } from './format';

const nice = (max: number) => { const m = 10 ** Math.floor(Math.log10(Math.max(1, max))); return [1, 2, 2.5, 5, 10].map(k => k * m).find(v => v >= max) ?? 10 * m; };

/** Living animals each evening, with births above the axis and deaths below it (one tick each, by cause class). */
export function populationSvg(series: { day: number[]; living: number[] }, births: { day: number }[], deaths: { day: number; klass: CauseClass }[], cap: number): string {
  const Wd = 860, H = 150, L = 34, R = 10, T = 14, B = 34;
  const n = series.day.length;
  if (!n) return '<p class="w-empty">The first evening census comes at 21:00 on day 1.</p>';
  const maxDay = Math.max(2, series.day[n - 1]), maxN = Math.max(...series.living);
  const top = nice(Math.max(maxN * 1.15, 10)), showCap = maxN >= 0.8 * cap && cap > 0;
  const yTop = showCap ? Math.max(top, nice(cap)) : top;
  const X = (d: number) => L + (d - 1) / (maxDay - 1) * (Wd - L - R), Y = (v: number) => T + (1 - v / yTop) * (H - T - B);
  let path = `M${X(series.day[0]).toFixed(1)} ${Y(series.living[0]).toFixed(1)}`;
  for (let i = 1; i < n; i++) path += `H${X(series.day[i]).toFixed(1)}V${Y(series.living[i]).toFixed(1)}`;
  const area = `${path}V${Y(0).toFixed(1)}H${X(series.day[0]).toFixed(1)}Z`;
  const ticks = [0, yTop / 2, yTop].map(v => `<line class="lc-grid" x1="${L}" x2="${Wd - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="lc-lab" x="${L - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end">${v}</text>`).join('');
  const days = [1, Math.round(maxDay / 2), maxDay].filter((d, i, a) => a.indexOf(d) === i).map(d => `<text class="lc-lab" x="${X(d).toFixed(1)}" y="${H - 6}" text-anchor="${d === 1 ? 'start' : d === maxDay ? 'end' : 'middle'}">day ${d}</text>`).join('');
  const bt = births.map(b => `<line class="lc-birth" x1="${X(b.day).toFixed(1)}" x2="${X(b.day).toFixed(1)}" y1="${Y(0) - 8}" y2="${Y(0) - 2}"/>`).join('');
  const dt = deaths.map(d => `<line class="lc-death k-${d.klass}" x1="${X(d.day).toFixed(1)}" x2="${X(d.day).toFixed(1)}" y1="${Y(0) + 3}" y2="${Y(0) + 10}"/>`).join('');
  const capLine = showCap ? `<rect class="lc-capband" x="${L}" y="${Y(cap).toFixed(1)}" width="${Wd - L - R}" height="${(Y(0.9 * cap) - Y(cap)).toFixed(1)}"/><text class="lc-lab" x="${Wd - R}" y="${(Y(cap) - 4).toFixed(1)}" text-anchor="end">cap ${cap}: a design limit; births from ${Math.round(0.9 * cap)} up are left out of the fertility rows</text>` : '';
  const alt = `Living animals each evening from day 1 to day ${maxDay}: ${series.living[0]} at the start, ${series.living[n - 1]} now, between ${Math.min(...series.living)} and ${maxN}; ${births.length} births and ${deaths.length} deaths.`;
  return `<svg class="lc lc-pop" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(alt)}">${ticks}${capLine}<path class="lc-area" d="${area}"/><path class="lc-line" d="${path}"/>${bt}${dt}${days}</svg>`;
}

/** Every death of the window in one bar, split by cause class (the orphaned-infant cause is in "other causes"). */
export function deathsBarSvg(counts: Record<CauseClass, number>): string {
  const classes = CAUSE_CLASSES.filter(k => k !== 'removed' && counts[k] > 0);
  const total = classes.reduce((a, k) => a + counts[k], 0);
  if (!total) return '<p class="w-empty">No deaths yet in this world’s record.</p>';
  const Wd = 860, H = 18;
  let x = 0;
  const segs = classes.map(k => { const w = counts[k] / total * Wd, s = `<rect class="lc-seg k-${k}" x="${x.toFixed(1)}" y="0" width="${Math.max(1, w - 1.5).toFixed(1)}" height="${H}" rx="3"/>`; x += w; return s; }).join('');
  const key = classes.map(k => `<span class="lc-key"><i class="k-${k}"></i>${esc(CAUSE_WORDS[k])} <b>${counts[k]}</b></span>`).join('');
  const alt = `${total} deaths: ${classes.map(k => `${counts[k]} ${CAUSE_WORDS[k]}`).join(', ')}.`;
  return `<svg class="lc lc-bar" viewBox="0 0 ${Wd} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(alt)}">${segs}</svg><div class="lc-keys">${key}</div>`;
}

/** Age classes for the small bars of deaths by age (years). */
export const AGE_CLASSES: readonly { label: string; lo: number; hi: number }[] = [
  { label: 'under 1', lo: 0, hi: 1 }, { label: '1 to 5', lo: 1, hi: 5 }, { label: '5 to 15', lo: 5, hi: 15 }, { label: '15 to 35', lo: 15, hi: 35 }, { label: '35 and over', lo: 35, hi: Infinity },
];
export function ageBarsSvg(deaths: DeathRow[]): string {
  const n = AGE_CLASSES.map(a => deaths.filter(d => d.age >= a.lo && d.age < a.hi).length), max = Math.max(1, ...n);
  if (!deaths.length) return '';
  const Wd = 420, row = 16;
  const bars = AGE_CLASSES.map((a, i) => `<text class="lc-lab" x="0" y="${i * row + 11}">${a.label}</text><rect class="lc-agebar" x="80" y="${i * row + 3}" width="${(n[i] / max * (Wd - 120)).toFixed(1)}" height="9" rx="2"/><text class="lc-lab" x="${(84 + n[i] / max * (Wd - 120)).toFixed(1)}" y="${i * row + 11}">${n[i]}</text>`).join('');
  return `<svg class="lc lc-age" viewBox="0 0 ${Wd} ${AGE_CLASSES.length * row}" role="img" aria-label="${esc(`Deaths by age: ${AGE_CLASSES.map((a, i) => `${n[i]} ${a.label}`).join(', ')}.`)}">${bars}</svg>`;
}

/** Deaths per animal-year in the scorer's age bins, by sex, on a log axis (females filled, males hollow), each with the
 * scorer's Poisson interval as a whisker (review, 19 October: one death in a few animal-years was a bare dot at a
 * rate above 1, read as a fact). Bins with no death are left blank, never drawn as zero. */
export function lifeTableSvg(exposure: { male: number[]; female: number[] }, deaths: { male: number[]; female: number[] }): string {
  const pts: { i: number; sex: 'male' | 'female'; r: number; d: number; e: number; lo: number; hi: number }[] = [];
  for (const sex of ['female', 'male'] as const) for (let i = 0; i < BINS.length - 1; i++) if (deaths[sex][i] > 0 && exposure[sex][i] > 0) {
    const d = deaths[sex][i], e = exposure[sex][i], [a, b] = poissonInterval(d);
    pts.push({ i, sex, r: d / e, d, e, lo: a / e, hi: b / e });
  }
  if (!pts.length) return '<p class="w-empty">No death yet: the life table has nothing to place.</p>';
  const Wd = 860, H = 140, L = 46, R = 10, T = 10, B = 30, nb = BINS.length - 1;
  const lo = Math.min(...pts.map(p => p.lo)), hi = Math.max(...pts.map(p => p.hi));
  const a = 10 ** Math.floor(Math.log10(lo)), b = 10 ** Math.ceil(Math.log10(hi) + 1e-9);
  const X = (i: number) => L + (i + 0.5) / nb * (Wd - L - R), Y = (v: number) => T + (1 - (Math.log10(v) - Math.log10(a)) / Math.max(1e-9, Math.log10(b) - Math.log10(a))) * (H - T - B);
  let s = '';
  for (let e = Math.log10(a); e <= Math.log10(b) + 1e-9; e++) s += `<line class="lc-grid" x1="${L}" x2="${Wd - R}" y1="${Y(10 ** e).toFixed(1)}" y2="${Y(10 ** e).toFixed(1)}"/><text class="lc-lab" x="${L - 6}" y="${(Y(10 ** e) + 3.5).toFixed(1)}" text-anchor="end">${10 ** e >= 1 ? 10 ** e : (10 ** e).toPrecision(1)}</text>`;
  for (let i = 0; i < nb; i++) s += `<text class="lc-lab" x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${BINS[i]}–${BINS[i + 1]}</text>`;
  for (const p of pts) {
    const cx = (X(p.i) + (p.sex === 'female' ? -5 : 5)).toFixed(1);
    s += `<g><title>${p.sex === 'female' ? 'Females' : 'Males'} ${BINS[p.i]}–${BINS[p.i + 1]} y: ${p.d} death${p.d === 1 ? '' : 's'} in ${p.e.toFixed(1)} animal-years (95% ${p.lo.toPrecision(2)}–${p.hi.toPrecision(2)} a year)</title><line class="lc-ltw" x1="${cx}" x2="${cx}" y1="${Y(p.hi).toFixed(1)}" y2="${Y(p.lo).toFixed(1)}"/><circle class="lc-lt ${p.sex}" cx="${cx}" cy="${Y(p.r).toFixed(1)}" r="3.5"/></g>`;
  }
  const alt = `Deaths per animal-year by age: ${pts.map(p => `${p.sex} ${BINS[p.i]} to ${BINS[p.i + 1]}: ${p.d} in ${p.e.toFixed(1)} animal-years`).join('; ')}.`;
  return `<svg class="lc lc-table" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(alt)}">${s}</svg>`;
}

/** One thin lane per infant born in the window, newest on top: age from 0 to 5 years, a rule at the first birthday. A
 * death ends a lane in its cause class's mark; a living infant ends in a round cap, with a dotted run to the rule while
 * it is under 1 (still at risk, not yet counted). Lanes never show the mother. */
export function infantLanesSvg(infants: InfantRow[], limit = 40): string {
  if (!infants.length) return '<p class="w-empty">No infant has been born in this world’s record yet.</p>';
  const shown = infants.slice(0, limit), Wd = 860, L = 4, R = 10, lane = 9, T = 18;
  const H = T + shown.length * lane + 8, X = (age: number) => L + Math.min(5, Math.max(0, age)) / 5 * (Wd - L - R);
  let s = [0, 1, 2, 3, 4, 5].map(y => `<line class="${y === 1 ? 'lc-rule' : 'lc-grid'}" x1="${X(y).toFixed(1)}" x2="${X(y).toFixed(1)}" y1="${T - 4}" y2="${H - 4}"/><text class="lc-lab" x="${X(y).toFixed(1)}" y="11" text-anchor="${y === 0 ? 'start' : y === 5 ? 'end' : 'middle'}">${y === 1 ? 'first birthday' : `${y} y`}</text>`).join('');
  shown.forEach((f, i) => {
    const y = T + i * lane + 3, x = X(f.age);
    s += `<g><title>${esc(f.name)}, ${f.sex}: ${f.died ? `died at ${f.age < 1 ? `${Math.max(1, Math.round(f.age * 12))} months` : `${f.age.toFixed(1)} years`} (${esc(CAUSE_WORDS[f.klass ?? 'other'])})` : `alive, ${f.age < 1 ? `${Math.max(1, Math.round(f.age * 12))} months` : `${f.age.toFixed(1)} years`} old`}</title>`;
    s += `<line class="lc-lane" x1="${X(0)}" x2="${x.toFixed(1)}" y1="${y}" y2="${y}"/>`;
    if (f.died) s += `<rect class="lc-end k-${f.klass}" x="${(x - 3).toFixed(1)}" y="${y - 3}" width="6" height="6" transform="rotate(45 ${x.toFixed(1)} ${y})"/>`;
    else {
      if (f.age < 1) s += `<line class="lc-risk" x1="${x.toFixed(1)}" x2="${X(1).toFixed(1)}" y1="${y}" y2="${y}"/>`;
      s += `<circle class="lc-cap" cx="${x.toFixed(1)}" cy="${y}" r="2.6"/>`;
    }
    s += '</g>';
  });
  const died1 = infants.filter(f => f.died && f.age < 1).length, under1 = infants.filter(f => !f.died && f.age < 1).length;
  const alt = `${infants.length} infants born: ${died1} died before their first birthday, ${under1} alive and still under one.`;
  return `<svg class="lc lc-lanes" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(alt)}">${s}</svg>${infants.length > limit ? `<p class="w-sub">The newest ${limit} of ${infants.length} infants.</p>` : ''}`;
}
