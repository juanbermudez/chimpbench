// Visual guide components for docs/architecture.html (and docs/guide-preview.html). Every chart is drawn from the JSON in
// docs/data/: guide-*.json (scripts/guide-data.ts) and the comparison files (scripts/compare-*.ts). No libraries, no
// network beyond those files. Figures render lazily when they come near the viewport and redraw only when their width
// changes. A figure whose data is missing says so; nothing is ever filled in by hand.
//
// Markup: <figure class="gv" data-gv="NAME"> with a static takeaway (the text alternative that also shows without
// scripts, e.g. on file:// where module scripts don't run). Data files are found through <link data-guide="…"> or
// <link data-compare="…"> in <head> (Vite fingerprints them in the build).

const FILES = {
  fruit: 'guide-fruit.json', paths: 'guide-paths.json', patrols: 'guide-patrols.json', validation: 'guide-validation.json',
  ranging: 'ranging-compare.json', movement: 'movement-compare.json', gombe: 'gombe-paths.json', patrol: 'patrol-compare.json',
};
const cache = {};
function load(name) {
  if (!cache[name]) {
    const link = document.querySelector(`link[data-guide="${name}"], link[data-compare="${name}"]`);
    const url = link ? link.href : `data/${FILES[name]}`;
    cache[name] = fetch(url, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  }
  return cache[name];
}

// ------------------------------------------------------------------------------------------------ helpers
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fin = v => typeof v === 'number' && Number.isFinite(v);
const pct = (v, d = 0) => (fin(v) ? (v * 100).toFixed(d) + '%' : '—');
const nf = new Intl.NumberFormat('en-US');
const num = (v, d = 2) => (!fin(v) ? '—' : Math.abs(v) >= 100 ? nf.format(Math.round(v)) : Math.abs(v) >= 10 ? v.toFixed(Math.min(d, 1)) : v.toFixed(d));
const f1 = v => (fin(v) ? v.toFixed(1) : '—');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sum = a => a.reduce((s, v) => s + (fin(v) ? v : 0), 0);
const maxOf = a => Math.max(...a.filter(fin));
const byId = list => Object.fromEntries((list || []).map(s => [s.id, s]));
const val = (s, side) => (s && s[side] && fin(s[side].value) ? s[side].value : null);
const svgOpen = (W, H, label) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}>`;
const set = (root, key, text) => root.querySelectorAll(`[data-v="${key}"]`).forEach(n => { n.textContent = text; });
const plotOf = fig => fig.querySelector('.gv-plot') || fig;
function paint(el, html) { el.innerHTML = html; el.classList.add('drawn'); }
function pending(el, text) { el.innerHTML = `<p class="ph">${esc(text)}</p>`; }

// One tooltip for the page, driven by data-tip on any element (pointer and keyboard focus).
let tip = null;
function tipOn(target, x, y) {
  if (!tip) { tip = document.createElement('div'); tip.className = 'gv-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  tip.innerHTML = target.getAttribute('data-tip');
  const r = tip.getBoundingClientRect(), vw = document.documentElement.clientWidth;
  tip.style.left = Math.max(8, Math.min(vw - r.width - 8, x + 12)) + 'px';
  tip.style.top = Math.max(8, y - r.height - 12) + 'px';
  tip.classList.add('on');
}
function tipOff() { if (tip) tip.classList.remove('on'); }
document.addEventListener('pointermove', e => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (t && t.closest('.gv')) tipOn(t, e.clientX, e.clientY); else tipOff();
}, { passive: true });
document.addEventListener('focusin', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) { const r = t.getBoundingClientRect(); tipOn(t, r.left + r.width / 2, r.top); } });
document.addEventListener('focusout', tipOff);
window.addEventListener('scroll', tipOff, { passive: true });

// Table twin: a <details> under the chart, built the first time it opens.
function table(fig, head, rows, label = 'Show the numbers') {
  let d = fig.querySelector(':scope > .gv-data');
  if (!d) { d = document.createElement('details'); d.className = 'gv-data'; const credit = fig.querySelector(':scope > .gv-credit'); fig.insertBefore(d, credit || null); }
  d.innerHTML = `<summary>${esc(label)}</summary><div class="gv-table"></div>`;
  d.addEventListener('toggle', () => {
    const box = d.querySelector('.gv-table');
    if (!d.open || box.firstChild) return;
    box.innerHTML = `<table><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows().map(r => `<tr>${r.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join('')}</tr>`).join('')}</tbody></table>`;
  }, { once: false });
}

// Fruit classes f1..f7 by thresholds.
const fclass = (v, th) => { if (!fin(v)) return 'fna'; if (v <= 0) return 'f0'; let k = 1; while (k < 7 && v > th[k - 1]) k++; return 'f' + k; };
function quantiles(values, k) { const s = values.filter(fin).sort((a, b) => a - b); return Array.from({ length: k - 1 }, (_, i) => s[Math.floor((i + 1) / k * (s.length - 1))]); }
const HATCH = '<defs><pattern id="gv-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="#111113"/><line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,.12)" stroke-width="1.2"/></pattern></defs>';

// Verdict display
const VLABEL = { pass: 'Pass', fail: 'Fail', inconclusive: 'Too close to call', insufficient: 'Not enough data yet', scale: 'Not scored at this scale', 'n/a': 'Mechanism not built yet', structural: 'Checked by a unit test', unscored: 'Not scored in this run', unscorable: 'Not scorable' };
const cellClass = v => (v === 'pass' || v === 'fail' || v === 'inconclusive' ? v : v === 'insufficient' || v === 'scale' ? 'nodata' : v === 'n/a' ? 'notbuilt' : 'unscored');
const WEAK = { encoded: 'encoded: the mechanism was designed from this very pattern, so a match is weak evidence', tuned: 'tuned: parameters were adjusted until it passed, so the pass does not count', compromised: 'compromised: the protocol changed after the value was seen' };

// ================================================================================================ components

// ---------- Pipeline: fills the counts of the static diagram and draws the registry's evidence mix.
function pipeline(fig, [V]) {
  if (!V) return;
  const ev = V.registry.evidence, field = (ev.H || 0) + (ev.M || 0);
  set(fig, 'datasets', String(V.datasets.length)); set(fig, 'sources', String(V.counts.sources)); set(fig, 'params', nf.format(V.registry.params));
  set(fig, 'targets', String(V.counts.targets)); set(fig, 'fitted', String(V.counts.fitted)); set(fig, 'heldOut', String(V.counts.heldOut)); set(fig, 'field', String(field));
  const parts = [['field', 'from field studies', field], ['cal', 'calibrated', ev.calibrated || 0], ['assumed', 'assumed', ev.assumed || 0], ['styl', 'stylized', ev.stylized || 0], ['design', 'design choices', ev.design || 0]];
  const mix = fig.querySelector('[data-v="evmix"]');
  if (mix) { mix.innerHTML = parts.map(p => `<i class="ev-${p[0]}" style="flex:${p[2]}"></i>`).join(''); mix.setAttribute('role', 'img'); mix.setAttribute('aria-label', parts.map(p => `${p[2]} ${p[1]}`).join(', ')); }
  const key = fig.querySelector('[data-v="evkey"]');
  if (key) key.innerHTML = `<span>Where the registry's ${nf.format(V.registry.params)} numbers come from:</span>` + parts.map(p => `<span><i class="gv-sq ev-${p[0]}"></i><b>${p[2]}</b> ${p[1]}</span>`).join('');
}

// ---------- Datasets on a time axis.
function datasets(fig, [V]) {
  const el = plotOf(fig);
  if (!V) return pending(el, 'The dataset list is not available.');
  const y0 = 1975, y1 = 2025, at = y => ((y - y0) / (y1 - y0) * 100).toFixed(2) + '%';
  const SITE = { Ngogo: 'var(--ngogo)', Gombe: 'var(--gombe)', 'Taï': 'var(--tai)' };
  const rows = [...V.datasets].sort((a, b) => a.years[0] - b.years[0]).map(d => {
    const a = at(d.years[0]), w = ((d.years[1] - d.years[0] + 1) / (y1 - y0) * 100).toFixed(2) + '%', late = d.years[1] > 2012;
    return `<li><span class="nm"><a href="${esc(d.url)}">${esc(d.name)}</a><small>${esc(d.site)} · ${esc(d.cite)}<span class="lic${d.use === 'build' ? ' use-build' : ''}">${d.use === 'build' ? 'builds the forest' : esc(d.licence)}</span></small></span>` +
      `<span class="tr"><i class="bar${d.use === 'build' ? ' build' : ''}" style="--a:${a};--w:${w};--k:${SITE[d.site] || 'var(--ink-2)'}" data-tip="<b>${esc(d.name)}</b><br>${esc(d.site)}, ${d.years[0]}–${d.years[1]} · ${esc(d.licence)}" tabindex="-1"></i><span class="yr${late ? ' l' : ''}" style="--a:${a};--w:${w}">${d.years[0]}–${d.years[1]}</span></span>` +
      `<span class="sz"><b>${esc(d.size.split(', ')[0])}</b>${esc(d.size.split(', ').slice(1).join(', '))}</span></li>`;
  }).join('');
  const ticks = [1980, 1990, 2000, 2010, 2020].map(y => `<span style="left:${at(y)}">${y}</span>`).join('');
  paint(el, `<ol class="dsl">${rows}</ol><div class="dsl-axis" aria-hidden="true"><div></div><div>${ticks}</div><div></div></div>`);
}

// ---------- Validation grid: every target as a cell, by role and domain; hover, focus or tap for details.
const DOMAIN_ORDER = ['Activity', 'Parties', 'Ranging', 'Food', 'Hunting', 'Patrols', 'Encounters', 'Killings', 'Fission', 'Social life', 'Life and death', 'Communication'];
function validation(fig, [V]) {
  const el = plotOf(fig);
  if (!V) return pending(el, 'The validation scorecard is not available.');
  let mode = 'standard', sel = null;
  const T = V.targets, S = V.sources || {};
  const verdictOf = t => (mode === 'fresh' && t.fresh ? t.fresh.verdict : t.verdict), keyOf = t => (mode === 'fresh' && t.fresh ? t.fresh.key : t.key);
  const meanOf = t => (mode === 'fresh' && t.fresh ? t.fresh.mean : t.mean);
  const runs = V.runs;
  el.innerHTML = `<div class="vg-top"><div class="vg-tiles" aria-live="polite"></div>` +
    (runs.fresh ? `<div class="seg" role="tablist" aria-label="Which simulated worlds"><button role="tab" aria-selected="true" data-mode="standard">Tuning seeds</button><button role="tab" aria-selected="false" data-mode="fresh">Fresh seeds</button></div>` : '') + `</div>` +
    `<div class="vg-panels"></div><div class="vg-key"></div><div class="vg-detail" aria-live="polite"></div>`;
  el.classList.add('drawn');
  const tiles = el.querySelector('.vg-tiles'), panels = el.querySelector('.vg-panels'), detail = el.querySelector('.vg-detail');

  function drawTiles() {
    const h = V.summary[mode]['held-out'], a = V.summary[mode].all;
    const cant = ['insufficient', 'n/a', 'scale', 'structural', 'unscored', 'unscorable'].reduce((s, k) => s + (a[k] || 0), 0);
    const weak = (a.encoded || 0) + (a.tuned || 0) + (a.compromised || 0);
    tiles.innerHTML = [[h.pass || 0, 'held-out passes', ''], [h.fail || 0, 'held-out fails', 'fail'], [h.inconclusive || 0, 'held-out too close to call', ''], [weak, 'weak (tuned, encoded, compromised)', ''], [cant, "can't be scored yet", '']]
      .map(t => `<div class="vg-tile ${t[2]}"><b>${t[0]}</b><span>${t[1]}</span></div>`).join('');
  }
  function cell(t) {
    const v = verdictOf(t), k = keyOf(t), weak = WEAK[k] ? ' weak' : '';
    return `<button type="button" class="vg-c ${cellClass(v)}${weak}" data-id="${esc(t.id)}" tabindex="-1" aria-pressed="false" aria-label="${esc(`${t.id}, ${t.metric}: ${VLABEL[v] || v}${weak ? ', weak evidence' : ''}`)}"></button>`;
  }
  function drawPanels() {
    panels.innerHTML = [['fitted', 'Fitted', 'may be tuned against'], ['held-out', 'Held out', 'never tuned: the real test']].map(([role, name, sub]) => {
      const mine = T.filter(t => t.role === role), doms = DOMAIN_ORDER.filter(d => mine.some(t => t.domain === d));
      return `<div class="vg-panel"><h4>${name} · ${mine.length}<span>${sub}</span></h4>` + doms.map(d => `<div class="vg-dom"><span>${esc(d)}</span><div class="vg-cells">${mine.filter(t => t.domain === d).map(cell).join('')}</div></div>`).join('') + `</div>`;
    }).join('');
    const cells = [...panels.querySelectorAll('.vg-c')];
    const focusable = cells.find(c => c.dataset.id === sel) || cells[0];
    if (focusable) focusable.tabIndex = 0;
    if (sel) { const c = cells.find(c => c.dataset.id === sel); if (c) c.setAttribute('aria-pressed', 'true'); }
  }
  function strip(t) {
    const r = t.range, seeds = (mode === 'fresh' ? [] : t.perSeed || []).filter(fin), m = meanOf(t);
    if (!r || !fin(m) && !seeds.length) return '';
    const vals = [r.lo, r.hi, m, ...seeds].filter(fin), lo = Math.min(0, ...vals), hi = Math.max(...vals) * 1.12 || 1, W = 460, H = 34, L = 6, R = 6;
    const X = v => L + (v - lo) / (hi - lo) * (W - L - R);
    let s = svgOpen(W, H, `${t.metric}: band ${r.lo} to ${r.hi}; simulated ${num(m, 3)}`);
    s += `<line x1="${L}" x2="${W - R}" y1="14" y2="14" class="gv-axis"/><rect x="${X(r.lo).toFixed(1)}" y="7" width="${Math.max(2, X(r.hi) - X(r.lo)).toFixed(1)}" height="14" rx="3" fill="rgba(255,255,255,.14)"/>`;
    seeds.forEach(v => { s += `<circle cx="${X(v).toFixed(1)}" cy="14" r="3.5" fill="var(--ink-2)" stroke="var(--well)" stroke-width="1.5"/>`; });
    if (fin(m)) s += `<circle cx="${X(m).toFixed(1)}" cy="14" r="5" fill="var(--mine)" stroke="var(--well)" stroke-width="2"/>`;
    s += `<text x="${X(r.lo).toFixed(1)}" y="32" class="gv-tick" text-anchor="middle">${num(r.lo, 2)}</text><text x="${X(r.hi).toFixed(1)}" y="32" class="gv-tick" text-anchor="middle">${num(r.hi, 2)}</text>`;
    return `<div class="d-strip">${s}</svg></div>`;
  }
  function showDetail(id) {
    const t = T.find(x => x.id === id); if (!t) return;
    const v = verdictOf(t), k = keyOf(t), m = meanOf(t);
    const tag = `<span class="vtag ${['pass', 'fail', 'inconclusive'].includes(v) ? v : 'soft'}">${esc(VLABEL[v] || v)}</span>`;
    const other = mode === 'standard' && t.fresh && t.fresh.verdict !== t.verdict ? ` <small>fresh seeds: ${esc(VLABEL[t.fresh.verdict] || t.fresh.verdict)}</small>` : mode === 'fresh' && t.fresh && t.fresh.verdict !== t.verdict ? ` <small>tuning seeds: ${esc(VLABEL[t.verdict] || t.verdict)}</small>` : '';
    const field = (t.field || []).map(f => `${esc(f.population)}${f.years ? ` (${esc(f.years)})` : ''}: ${esc(f.value)}`).join('<br>');
    const src = (t.sources || []).map(k2 => S[k2] ? (S[k2].url ? `<a href="${esc(S[k2].url)}">${esc(S[k2].short)}</a>` : esc(S[k2].short)) : esc(k2)).join(', ');
    detail.innerHTML = `<div class="d-h"><code>${esc(t.id)}</code><b>${esc(t.metric)}</b>${tag}<span class="vtag soft">${t.role === 'fitted' ? 'fitted' : 'held out'}</span>${WEAK[k] ? `<span class="vtag soft">${esc(k)}</span>` : ''}${other}</div>` +
      `<p>Band <b>${esc(t.band || '—')}</b> ${esc(t.units)}${t.basis ? ` <small>(${esc(t.basis)})</small>` : ''} · simulated <b>${fin(m) ? num(m, 3) : '—'}</b>${t.perSeed && t.perSeed.length && mode === 'standard' ? ` <small>(${t.perSeed.filter(fin).length} seeds)</small>` : ''}</p>` +
      strip(t) + (field ? `<p><small>Field:</small><br>${field}</p>` : '') + (t.note ? `<p><small>${esc(t.note)}</small></p>` : '') +
      (WEAK[k] ? `<p><small>${esc(WEAK[k])}.</small></p>` : '') + (src ? `<p><small>Sources: ${src}</small></p>` : '');
  }
  function select(id, focus) {
    sel = id;
    panels.querySelectorAll('.vg-c').forEach(c => { const on = c.dataset.id === id; c.setAttribute('aria-pressed', String(on)); c.tabIndex = on ? 0 : -1; if (on && focus) c.focus(); });
    showDetail(id);
  }
  panels.addEventListener('pointerover', e => { const c = e.target.closest('.vg-c'); if (c) showDetail(c.dataset.id); });
  panels.addEventListener('pointerleave', () => { if (sel) showDetail(sel); });
  panels.addEventListener('click', e => { const c = e.target.closest('.vg-c'); if (c) select(c.dataset.id); });
  panels.addEventListener('focusin', e => { const c = e.target.closest('.vg-c'); if (c) showDetail(c.dataset.id); });
  panels.addEventListener('keydown', e => {
    const cells = [...panels.querySelectorAll('.vg-c')], i = cells.indexOf(document.activeElement);
    if (i < 0) return;
    const go = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: cells.length - 1 }[e.key];
    if (go === undefined) return;
    e.preventDefault(); select(cells[Math.max(0, Math.min(cells.length - 1, go))].dataset.id, true);
  });
  el.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode; el.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    drawTiles(); drawPanels(); showDetail(sel || firstFail);
    set(fig, 'runinfo', runText());
  }));
  const runText = () => { const r = runs[mode] || runs.standard; return `${mode === 'fresh' ? 'Fresh seeds, never used while building' : 'The five tuning seeds'} (${r.seeds.join(', ')}), ${r.days} observed days each after a ${r.burnInDays}-day burn-in, field profile, run ${r.date}.`; };
  el.querySelector('.vg-key').innerHTML = [['pass', 'Pass'], ['fail', 'Fail'], ['inconclusive', 'Too close to call'], ['nodata', 'Not enough data yet'], ['notbuilt', 'Mechanism not built yet'], ['unscored', 'Not scored'], ['pass weak', 'Weak evidence (tuned, encoded, compromised): not counted']]
    .map(k => `<span><i class="vg-c ${k[0]}" aria-hidden="true"></i>${k[1]}</span>`).join('');
  const firstFail = (T.find(t => t.role === 'held-out' && t.verdict === 'fail') || T[0]).id;
  drawTiles(); drawPanels(); select(firstFail, false);
  set(fig, 'runinfo', runText());
  const hs = V.summary.standard['held-out'], hf = V.summary.fresh['held-out'];
  set(fig, 'take', `Of ${V.counts.heldOut} held-out targets, ${hs.pass || 0} pass and ${hs.fail || 0} fail on the tuning seeds; on fresh seeds it's ${hf.pass || 0} and ${hf.fail || 0}.`);
  table(fig, ['Target', 'Metric', 'Role', 'Band', 'Simulated', 'Verdict', 'Fresh seeds'], () => T.map(t => [t.id, t.metric, t.role, t.band || '', fin(t.mean) ? num(t.mean, 3) : '', VLABEL[t.verdict] || t.verdict, t.fresh ? VLABEL[t.fresh.verdict] || t.fresh.verdict : '']), 'All targets as a table');
}

// ---------- Behaviour strips: band, each seed and the mean, for a curated set of targets.
const BEHAVIOURS = [
  ['T-ACT-2', 'Share of the day travelling'], ['T-ACT-3', 'Share of the day grooming'], ['T-ACT-1', 'Share of the day feeding'], ['T-FOOD-2', 'Fruit share of feeding time'],
  ['T-PTY-1', 'Party size'], ['T-SOC-9', 'Fights followed by making up'], ['T-SOC-5', 'How steep the male hierarchy is'], ['T-SOC-2', 'Male bonds with non-kin'],
  ['T-HUN-2', 'Hunts that succeed'], ['T-COM-1', 'Pant-hoots per male-hour'], ['T-PAT-1', 'Patrols per week'], ['T-RNG-1', 'Community home range (km²)'],
];
function behaviours(fig, [V]) {
  const el = plotOf(fig);
  if (!V) return pending(el, 'The scorecard is not available.');
  const T = byId(V.targets), W = Math.max(160, Math.round((el.clientWidth || 600) * (el.clientWidth < 700 ? 1 : 0.36))), H = 22;
  const rows = BEHAVIOURS.map(([id, label]) => {
    const t = T[id]; if (!t || !t.range) return '';
    const seeds = (t.perSeed || []).filter(fin), m = t.mean, r = t.range, P = t.parts;
    const inBand = v => v >= r.lo && v <= r.hi;
    const vals = [r.lo, r.hi, ...seeds, ...(P ? [P.male, P.female] : [])].filter(fin), lo = Math.min(0, ...vals), hi = Math.max(...vals) * 1.12, X = v => 5 + (v - lo) / (hi - lo) * (W - 10);
    let s = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line x1="5" x2="${W - 5}" y1="11" y2="11" class="gv-axis"/><rect x="${X(r.lo).toFixed(1)}" y="4" width="${Math.max(2, X(r.hi) - X(r.lo)).toFixed(1)}" height="14" rx="3" fill="rgba(255,255,255,.16)"><title>Field band ${r.lo}–${r.hi}</title></rect>`;
    // Sex-specific targets are scored per sex: draw the male and female values (the pooled seeds would hide the miss).
    if (P) [['male', 'M'], ['female', 'F']].forEach(([k, lab]) => { const v = P[k], x = X(v).toFixed(1); s += `<g data-tip="${k === 'male' ? 'Males' : 'Females'}: <b>${num(v, 3)}</b>${inBand(v) ? '' : ' (outside the band)'}"><circle cx="${x}" cy="11" r="7" fill="${inBand(v) ? 'var(--mine)' : 'var(--warn)'}" stroke="var(--surface)" stroke-width="2"/><text x="${x}" y="14.5" text-anchor="middle" style="font:600 9px var(--sans);fill:#0a0a0b">${lab}</text></g>`; });
    else seeds.forEach((v, i) => { s += `<circle cx="${X(v).toFixed(1)}" cy="11" r="4" fill="${inBand(v) ? 'var(--mine)' : 'var(--warn)'}" fill-opacity=".9" stroke="var(--surface)" stroke-width="2" data-tip="Seed ${i + 1}: <b>${num(v, 3)}</b>"/>`; });
    s += '</svg>';
    const weak = WEAK[t.key] ? ` · ${t.key}` : '';
    const mine = P ? `males ${num(P.male, 2)}, females ${num(P.female, 2)}` : `simulated ${num(m, 2)}`;
    // A tuned or encoded pass is not a pass: it shows as its label, not as "Pass".
    const tag = WEAK[t.key] && t.verdict === 'pass' ? `<span class="vtag soft">${esc(t.key[0].toUpperCase() + t.key.slice(1))}</span>` : `<span class="vtag ${['pass', 'fail', 'inconclusive'].includes(t.verdict) ? t.verdict : 'soft'}">${esc(t.verdict === 'inconclusive' ? 'Too close' : VLABEL[t.verdict] || t.verdict)}</span>`;
    return `<li><span>${esc(label)}<small>field ${esc(t.band)} · ${mine}${weak} · ${esc(t.field?.[0]?.population || '')}</small></span>${s}${tag}</li>`;
  }).join('');
  paint(el, `<ul class="bs">${rows}</ul>`);
  table(fig, ['Target', 'Behaviour', 'Field band', 'Simulated (mean of seeds)', 'Seeds', 'Verdict'], () => BEHAVIOURS.filter(b => T[b[0]]).map(([id, label]) => { const t = T[id]; return [id, label, t.band, num(t.mean, 3), (t.perSeed || []).map(v => num(v, 3)).join(' · '), VLABEL[t.verdict] || t.verdict]; }));
}

// ---------- Fruit calendar: 20 years × 12 months of ripe fruit, rain in the margins.
function fruit(fig, [F]) {
  const el = plotOf(fig);
  if (!F) return pending(el, 'The phenology data is not available.');
  const S = F.site, W = Math.max(300, el.clientWidth), narrow = W < 560;
  const L = 38, RW = narrow ? 44 : 84, gap = 2, ch = narrow ? 11 : 14, top = 18, n = S.rfs.length;
  const cw = (W - L - RW - 10 - gap * 11) / 12, gridH = n * (ch + gap), mh = narrow ? 30 : 38, y2 = top + gridH + 16, y3 = y2 + mh + 20, H = y3 + mh + 22;
  const th = quantiles(S.rfs.flat().filter(v => fin(v) && v > 0).map(v => Math.log(v)), 7).map(Math.exp);
  const X = m => L + m * (cw + gap);
  let s = svgOpen(W, H, 'Heat map of the ripe fruit score at Ngogo for each month from 1998 to 2017, with monthly and yearly rainfall.') + HATCH;
  MONTHS.forEach((m, i) => { s += `<text x="${(X(i) + cw / 2).toFixed(1)}" y="12" text-anchor="middle" class="gv-tick">${narrow ? m[0] : m}</text>`; });
  S.rfs.forEach((row, y) => {
    const yr = S.years[0] + y, yy = top + y * (ch + gap);
    if (!narrow || y % 2 === 0) s += `<text x="${L - 6}" y="${(yy + ch - 2).toFixed(1)}" text-anchor="end" class="gv-tick">${narrow ? "'" + String(yr).slice(2) : yr}</text>`;
    row.forEach((v, m) => {
      const r = S.rain[y][m], sh = S.share[y][m];
      s += `<rect x="${X(m).toFixed(1)}" y="${yy.toFixed(1)}" width="${cw.toFixed(1)}" height="${ch}" rx="2" class="${fclass(v, th)}" data-tip="<b>${MONTHS[m]} ${yr}</b><br>${fin(v) ? `ripe-fruit score ${nf.format(v)}` : 'no fruit record'}${fin(sh) ? ` · ${pct(sh, 1)} of trees in fruit` : ''}${fin(r) ? `<br>rain ${Math.round(r)} mm` : ''}"/>`;
    });
    const ar = S.annualRain[y], bx = L + 12 * (cw + gap) + 8, bw = RW - (narrow ? 8 : 40);
    if (fin(ar)) {
      const w = ar / maxOf(S.annualRain) * bw;
      s += `<rect x="${bx}" y="${(yy + 2).toFixed(1)}" width="${w.toFixed(1)}" height="${ch - 4}" rx="1.5" style="fill:var(--rain)" fill-opacity=".75" data-tip="<b>${yr}</b>: ${nf.format(ar)} mm of rain"/>`;
      if (!narrow) s += `<text x="${(bx + w + 5).toFixed(1)}" y="${(yy + ch - 3).toFixed(1)}" class="gv-tick">${nf.format(ar)}</text>`;
    } else s += `<text x="${bx}" y="${(yy + ch - 3).toFixed(1)}" class="gv-tick">${narrow ? '·' : 'part year'}</text>`;
  });
  s += `<text x="${L + 12 * (cw + gap) + 8}" y="12" class="gv-tick">${narrow ? 'rain' : 'rain / year, mm'}</text>`;
  // Month medians: fruit and rain, each on its own scale (never one axis for two measures).
  const bars = (vals, y0, h, style, label, fmt) => {
    const mx = maxOf(vals); let o = `<text x="${L - 6}" y="${y0 + h}" text-anchor="end" class="gv-tick">${label}</text>`;
    vals.forEach((v, m) => { if (!fin(v)) return; const bh = Math.max(1, v / mx * h); o += `<rect x="${(X(m) + cw * 0.18).toFixed(1)}" y="${(y0 + h - bh).toFixed(1)}" width="${(cw * 0.64).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" style="${style}" data-tip="<b>${MONTHS[m]}</b>, median of all years: ${fmt(v)}"/>`; });
    const im = vals.indexOf(mx);
    o += `<text x="${(X(im) + cw / 2).toFixed(1)}" y="${y0 - 3}" text-anchor="middle" class="gv-tick">${fmt(mx)}</text>`;
    return o;
  };
  s += bars(S.monthlyRfs, y2, mh, 'fill:var(--f6)', 'fruit', v => nf.format(Math.round(v)));
  s += bars(S.monthlyRain, y3, mh, 'fill:var(--rain)', 'rain', v => Math.round(v) + ' mm');
  s += `<text x="${W - 4}" y="${H - 4}" text-anchor="end" class="gv-note">bottom rows: median month over ${n} years</text>`;
  paint(el, s + '</svg>');
  const top2 = (a, f) => a.map((v, i) => [v, i]).filter(x => fin(x[0])).sort((p, q) => q[0] - p[0]).slice(0, 2).map(x => MONTHS[x[1]]).sort((p, q) => MONTHS.indexOf(p) - MONTHS.indexOf(q)).join(' and ');
  const low = a => MONTHS[a.indexOf(Math.min(...a.filter(fin)))];
  const annual = S.annualRain.filter(fin);
  set(fig, 'sub', `Median fruit peaks in ${top2(S.monthlyRfs)} and bottoms out in ${low(S.monthlyRfs)}; rain peaks in ${top2(S.monthlyRain)}. Whole years of rain ranged from ${nf.format(Math.min(...annual))} to ${nf.format(Math.max(...annual))} mm.`);
  const key = fig.querySelector('[data-v="ramp"]');
  if (key) key.innerHTML = `<span>less</span><span class="fruit-ramp" title="each colour holds a seventh of the months">${[1, 2, 3, 4, 5, 6, 7].map(k => `<i style="background:var(--f${k})"></i>`).join('')}</span><span>more ripe fruit</span><span><i class="gv-sq" style="--k:var(--rain)"></i>rain</span><span>each colour: a seventh of the months</span>`;
  table(fig, ['Year', ...MONTHS, 'Rain, mm'], () => S.rfs.map((row, y) => [String(S.years[0] + y), ...row.map(v => (fin(v) ? nf.format(v) : '')), fin(S.annualRain[y]) ? nf.format(S.annualRain[y]) : '']), 'Show the ripe-fruit scores');
}

// ---------- Species small multiples.
function species(fig, [F]) {
  const el = plotOf(fig);
  if (!F) return pending(el, 'The phenology data is not available.');
  const Sp = F.species, th = [0.02, 0.05, 0.1, 0.2, 0.35, 0.5], cw = 10, ch = 4, gap = 1;
  const tiles = Sp.list.map(sp => {
    const H = sp.months.length * (ch + gap), W = 12 * (cw + gap);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${sp.name}: share of stems with ripe fruit by month, ${Sp.years[0]}–${Sp.years[1]}`)}">${HATCH}`;
    sp.months.forEach((row, y) => row.forEach((v, m) => { s += `<rect x="${m * (cw + gap)}" y="${y * (ch + gap)}" width="${cw}" height="${ch}" class="${fclass(v, th)}" data-tip="<b><i>${esc(sp.name)}</i></b><br>${MONTHS[m]} ${Sp.years[0] + y}: ${fin(v) ? pct(v) + ' of stems ripe' : 'no record'}"/>`; }));
    const peak = sp.monthly.indexOf(maxOf(sp.monthly));
    return `<figure><figcaption><i>${esc(sp.name)}</i><span>${sp.fig ? 'fig · ' : ''}peak ${MONTHS[peak]}</span></figcaption>${s}</svg></figure>`;
  }).join('');
  paint(el, `<div class="spp">${tiles}</div>`);
  // The most seasonal species: highest peak month relative to its mean month.
  const season = Sp.list.map(sp => { const mx = maxOf(sp.monthly), mean = sum(sp.monthly) / 12; return { sp, mx, ratio: mean > 0 ? mx / mean : 0, m: sp.monthly.indexOf(mx) }; }).sort((a, b) => b.ratio - a.ratio)[0];
  const figs = Sp.list.filter(s => s.fig), figMonths = figs.length ? Math.min(...figs.map(s => s.monthly.filter(v => fin(v) && v > 0).length)) : 0;
  set(fig, 'sub', `Rows are years (${Sp.years[0]} at the top), columns months. The most seasonal, ${season.sp.name}, has a median ${pct(season.mx)} of its stems ripe in ${MONTHS[season.m]}. In a median year the figs have ripe stems in ${figMonths} of 12 months.`);
  const key = fig.querySelector('[data-v="ramp"]');
  if (key) key.innerHTML = `<span>share of stems with ripe fruit:</span><span class="fruit-ramp">${[0, 1, 2, 3, 4, 5, 6, 7].map(k => `<i style="background:var(--f${k})"></i>`).join('')}</span><span>0 · 2 · 5 · 10 · 20 · 35 · 50%+</span>`;
  table(fig, ['Species', ...MONTHS], () => Sp.list.map(sp => [sp.name, ...sp.monthly.map(v => pct(v))]), 'Median month by species');
}

// ---------- Day paths: six days each, Gombe and mine, on a 0.1 r lattice.
function paths(fig, [P]) {
  const el = plotOf(fig);
  if (!P) return pending(el, 'The path data is not available.');
  const all = [...P.gombe.paths, ...P.sim.paths].flatMap(p => p.pts);
  const xm = Math.max(3, ...all.map(p => Math.abs(p[0]))) + 1, ylo = Math.min(0, ...all.map(p => p[1])) - 1, yhi = Math.max(...all.map(p => p[1])) + 1;
  const side = Math.max(2 * xm, yhi - ylo), cx = side / 2, oy = yhi + (side - (yhi - ylo)) / 2;
  const tile = (p, color, i, who) => {
    const pts = p.pts.map(([u, v]) => [cx + u, oy - v]);
    let s = `<svg viewBox="0 0 ${side} ${side}" role="img" aria-label="${esc(`${who} day ${i + 1}: straightness ${p.straight}, walked ${p.pathR} r, ended ${p.netR} r from the start`)}">`;
    s += `<rect width="${side}" height="${side}" fill="url(#gv-lattice)"/>`;
    s += `<polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" style="stroke:${color}" stroke-width="${side / 60}" stroke-linejoin="round" stroke-linecap="round"/>`;
    s += `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="${side / 45}" fill="var(--well)" style="stroke:${color}" stroke-width="${side / 110}"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="${side / 40}" style="fill:${color}"/>`;
    if (i === 0 && who === 'Gombe') s += `<line x1="${side * 0.06}" x2="${side * 0.06 + 5}" y1="${side * 0.94}" y2="${side * 0.94}" stroke="var(--ink-3)" stroke-width="${side / 110}"/><text x="${side * 0.06}" y="${side * 0.9}" style="font:${side / 14}px var(--sans);fill:var(--ink-3)">0.5 r</text>`;
    return `<figure>${s}</svg><figcaption>${p.straight.toFixed(2)}</figcaption></figure>`;
  };
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="gv-lattice" width="1" height="1" patternUnits="userSpaceOnUse" x="${cx % 1}" y="${oy % 1}"><circle cx="0" cy="0" r="0.07" fill="rgba(255,255,255,.16)"/></pattern></defs></svg>`;
  const row = (d, color, who, sub) => `<div class="dp-row"><span>${who}<small>${sub}</small></span><div class="dp-tiles">${d.paths.map((p, i) => tile(p, color, i, who)).join('')}</div></div>`;
  // Straightness of every full day, both sides.
  const Wh = Math.max(280, el.clientWidth), Hh = 110, L = 8, R = 8, B = 22, top = 24, bins = P.gombe.straightHist.length;
  const X = v => L + v * (Wh - L - R), mx = Math.max(...P.gombe.straightHist, ...P.sim.straightHist);
  const Y = v => top + (1 - v / mx) * (Hh - top - B);
  const step = (h, cls) => { let d = `M${X(0)} ${Y(0)}`; h.forEach((v, i) => { d += `L${X(i / bins).toFixed(1)} ${Y(v).toFixed(1)}L${X((i + 1) / bins).toFixed(1)} ${Y(v).toFixed(1)}`; }); return `<path d="${d}L${X(1)} ${Y(0)}" ${cls}/>`; };
  let hs = svgOpen(Wh, Hh, `Straightness of every full day: Gombe median ${P.gombe.straight}, simulated ${P.sim.straight}.`);
  hs += `<line x1="${L}" x2="${Wh - R}" y1="${Y(0)}" y2="${Y(0)}" class="gv-axis"/>`;
  hs += step(P.gombe.straightHist, 'fill="var(--gombe)" fill-opacity=".14" style="stroke:var(--gombe)" stroke-width="2" stroke-linejoin="round"');
  hs += step(P.sim.straightHist, 'fill="none" style="stroke:var(--mine)" stroke-width="2" stroke-dasharray="5 3" stroke-linejoin="round"');
  // Median labels sit above the plot, the lower median to the left of its line and the higher to the right, so they never collide.
  [[P.gombe.straight, 'var(--gombe)', 'Gombe median'], [P.sim.straight, 'var(--mine)', 'simulated median']].forEach(([v, c, n]) => {
    const right = v === Math.max(P.gombe.straight, P.sim.straight), tw = (n.length + 5) * 6.4;
    const x = right ? Math.min(X(v) + 5, Wh - R - tw) : Math.max(X(v) - 5, L + tw);
    hs += `<line x1="${X(v)}" x2="${X(v)}" y1="${top - 10}" y2="${Y(0)}" style="stroke:${c}" stroke-dasharray="1 3" stroke-width="1.5"/><text x="${x}" y="${top - 12}" text-anchor="${right ? 'start' : 'end'}" class="gv-lab">${n} ${v.toFixed(2)}</text>`;
  });
  [0, 0.25, 0.5, 0.75, 1].forEach(v => { hs += `<text x="${X(v)}" y="${Hh - 6}" text-anchor="${v === 0 ? 'start' : v === 1 ? 'end' : 'middle'}" class="gv-tick">${v}</text>`; });
  hs += `<text x="${Wh / 2}" y="${Hh - 6}" text-anchor="middle" class="gv-tick" dy="0"></text></svg>`;
  paint(el, defs + `<div class="dp">${row(P.gombe, 'var(--gombe)', 'Gombe', `r = ${P.gombe.rKm} km`)}${row(P.sim, 'var(--mine)', 'Simulated', `r = ${P.sim.rKm} km`)}</div>` +
    `<div class="gv-fade" style="margin-top:14px"><p class="gv-sub" style="margin-bottom:4px">Straightness of every full day: ${nf.format(P.gombe.fullDays)} at Gombe, ${nf.format(P.sim.fullDays)} simulated (0 = back where it started, 1 = a straight line)</p>${hs}</div>`);
  set(fig, 'sub', `Each tile starts at the ring and ends at the dot, turned so the day's net move points up and snapped to a grid of 0.1 range radius (r) for privacy. Median day: Gombe walks ${num(P.gombe.pathR, 2)} r and ends ${num(P.gombe.netR, 2)} r away; simulated chimps walk ${num(P.sim.pathR, 2)} r and end ${num(P.sim.netR, 2)} r away. The number under each tile is its straightness.`);
  if (P.sim.status !== 'measured') set(fig, 'simstatus', 'Simulated follows from the C7a build (sim code ' + P.sim.simCodeHash + '); a re-run is due.');
  table(fig, ['Side', 'Day', 'Straightness', 'Walked (r)', 'Net move (r)', 'Hours'], () => [...P.gombe.paths.map((p, i) => ['Gombe', i + 1, p.straight, p.pathR, p.netR, p.hours]), ...P.sim.paths.map((p, i) => ['Simulated', i + 1, p.straight, p.pathR, p.netR, p.hours])]);
}

// ---------- Turning angles as a rose: straight on at the top, doubling back at the bottom.
function turns(fig, [M, G]) {
  const el = plotOf(fig);
  const D = M && M.distributions && M.distributions.turn, GD = G && G.distributions && G.distributions.turn30;
  if (!D) return pending(el, 'The movement comparison is not available.');
  const merge = a => { const o = []; for (let i = 0; i < a.length; i += 2) o.push((a[i] + (a[i + 1] ?? a[i])) / 2); return o; };
  const series = [
    { name: 'Taï', color: 'var(--tai)', d: merge(D.real), dash: '' },
    ...(GD && GD.gombe ? [{ name: 'Gombe', color: 'var(--gombe)', d: merge(GD.gombe), dash: '' }] : []),
    { name: 'Simulated', color: 'var(--mine)', d: merge(D.sim), dash: '5 3' },
  ];
  const n = series[0].d.length, mx = Math.max(...series.flatMap(s => s.d));
  const W = Math.min(420, Math.max(260, el.clientWidth)), H = W, cx = W / 2, cy = H / 2, R = W / 2 - 34;
  const pt = (k, f) => { const th = (k + 0.5) / n * Math.PI; return [cx + Math.sin(th) * R * f, cy - Math.cos(th) * R * f]; };
  let s = svgOpen(W, H, 'Rose of turning angles between consecutive steps: Taï and Gombe chimps mostly continue straight on; simulated chimps often turn back.');
  [0.25, 0.5, 0.75, 1].forEach(f => { s += `<circle cx="${cx}" cy="${cy}" r="${(R * f).toFixed(1)}" fill="none" class="gv-grid"/>`; });
  s += `<line x1="${cx}" x2="${cx}" y1="${cy - R}" y2="${cy + R}" class="gv-grid"/><line x1="${cx - R}" x2="${cx + R}" y1="${cy}" y2="${cy}" class="gv-grid"/>`;
  series.forEach(se => {
    const right = se.d.map((v, k) => pt(k, Math.sqrt(v / mx))), left = right.map(([x, y]) => [2 * cx - x, y]).reverse();
    const d = 'M' + [...right, ...left].map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
    s += `<path d="${d}" style="stroke:${se.color};fill:${se.color}" fill-opacity="${se.name === 'Simulated' ? 0 : 0.08}" stroke-width="2" stroke-linejoin="round"${se.dash ? ` stroke-dasharray="${se.dash}"` : ''}/>`;
  });
  s += `<text x="${cx}" y="${cy - R - 12}" text-anchor="middle" class="gv-lab">straight on</text><text x="${cx}" y="${cy + R + 22}" text-anchor="middle" class="gv-lab">turns back</text>`;
  s += `<text x="${cx + R + 4}" y="${cy - 6}" class="gv-tick" text-anchor="end">90°</text><text x="${cx - R - 4}" y="${cy - 6}" class="gv-tick">90°</text>`;
  paint(el, s + '</svg>');
  // Share of turns sharper than 135°, from each histogram (density per radian, equal bins).
  const back = a => { const k0 = Math.floor(a.length * 0.75); return sum(a.slice(k0)) / sum(a); };
  const m = byId(M.scorecard), tr = m.turn, gm = G && G.real && G.real.at30 && G.real.at30.turn;
  const deg = v => Math.round(v * 180 / Math.PI) + '°';
  const rows = [['Taï', val(tr, 'real'), back(D.real), 'steps ≥ 15 m'], ...(gm ? [['Gombe', gm.median, back(GD.gombe), '30-min records']] : []), ['Simulated', val(tr, 'sim'), back(D.sim), 'as Taï']];
  set(fig, 'sub', rows.map(r => `${r[0]}: median turn ${deg(r[1])}, ${pct(r[2])} of turns sharper than 135°`).join(' · ') + '.');
  const leg = fig.querySelector('.gv-legend');
  if (leg) leg.innerHTML = series.map(se => `<span><i class="gv-sw${se.dash ? ' dash' : ''}" style="--k:${se.color}"></i>${se.name}</span>`).join('') + '<span>radius: √share of turns</span>';
  table(fig, ['Site', 'Median turn', 'Sharper than 135°', 'Rule'], () => rows.map(r => [r[0], deg(r[1]) + ` (${num(r[1], 2)} rad)`, pct(r[2]), r[3]]));
}

// ---------- Range to scale: my community ranges against size-matched wild ones.
function scale(fig, [R, M, V]) {
  const el = plotOf(fig);
  if (!R || !M || !V) return pending(el, 'The range comparison is not available.');
  const r = byId(R.scorecard), m = byId(M.scorecard), t1 = V.targets.find(t => t.id === 'T-RNG-1');
  const terr = m.territory, comm = r.commArea95;
  const sets = [
    t1 && t1.range && fin(t1.mean) ? { title: 'Wild communities of about 22', lo: t1.range.lo, hi: t1.range.hi, mine: t1.mean, note: `${t1.range.lo}–${t1.range.hi} km²`, mineNote: `simulated West (22): ${num(t1.mean, 1)} km²` } : null,
    terr ? { title: 'Taï groups of 11–23', lo: terr.real.lo, hi: terr.real.hi, mid: terr.real.value, mine: terr.sim.value, note: `${num(terr.real.lo, 1)}–${num(terr.real.hi, 1)} km², median ${num(terr.real.value, 1)}`, mineNote: `simulated: ${num(terr.sim.value, 1)} km²` } : null,
    comm ? { title: 'Ngogo, about 200 members', mid: comm.real.value, mine: comm.sim.value, note: `${num(comm.real.value, 1)} km²: not a size match`, mineNote: `simulated: ${num(comm.sim.value, 1)} km²`, faint: true } : null,
  ].filter(Boolean);
  const top = Math.max(...sets.map(x => Math.max(x.hi || 0, x.mid || 0)));
  const S = 200, rOf = a => Math.sqrt(a / top) * (S / 2 - 4);
  const disc = x => {
    const cy = S - 4, circle = (a, attrs) => `<circle cx="${S / 2}" cy="${(cy - rOf(a)).toFixed(1)}" r="${rOf(a).toFixed(1)}" ${attrs}/>`;
    let s = `<svg viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(`${x.title}: ${x.note}; ${x.mineNote}`)}">`;
    if (x.hi) s += circle(x.hi, 'fill="rgba(79,149,224,.10)" style="stroke:var(--ngogo)" stroke-width="1.2" stroke-dasharray="3 3"') + circle(x.lo, 'fill="var(--surface)" style="stroke:var(--ngogo)" stroke-width="1.2"');
    if (x.mid) s += circle(x.mid, `fill="none" style="stroke:var(--${x.faint ? 'ink-3' : 'ngogo'})" stroke-width="1.6"`);
    s += circle(x.mine, 'style="fill:var(--mine)"');
    const ref = x.lo || x.mid, ratio = ref / x.mine;
    return `<figure>${s}</svg><figcaption><b>${x.lo ? '≥ ' : ''}${ratio.toFixed(1)}×</b>${esc(x.title)}<br>${esc(x.note)}<br>${esc(x.mineNote)}</figcaption></figure>`;
  };
  paint(el, `<div class="discs">${sets.map(disc).join('')}</div>`);
  const edge = r.edge, core = r.commCore || r.core;
  set(fig, 'sub', `All three drawn to one scale. The pattern of use, measured in range radii, does match: fixes sit ${num(val(edge, 'sim'), 2)} r inside the edge (Ngogo ${num(val(edge, 'real'), 2)}), and the core holds ${pct(val(core, 'sim'))} of the area (Ngogo ${pct(val(core, 'real'))}). The shape is right; the area is too small.`);
  table(fig, ['Yardstick', 'Wild, km²', 'Simulated, km²', 'Simulated smaller by'], () => sets.map(x => [x.title, x.lo ? `${x.lo}–${x.hi}` : num(x.mid, 1), num(x.mine, 2), (x.lo ? '≥ ' : '') + ((x.lo || x.mid) / x.mine).toFixed(1) + '×']));
}

// ---------- Activity budget as stacked bars (Taï follow records vs my follows, same sampling).
function activity(fig, [M]) {
  const el = plotOf(fig);
  if (!M) return pending(el, 'The movement comparison is not available.');
  const m = byId(M.scorecard), cats = [['feed', 'Feeding', 'var(--act-feed)'], ['rest', 'Resting (incl. grooming)', 'var(--act-rest)'], ['travel', 'Travelling', 'var(--act-travel)']];
  const bar = (side, name) => {
    const v = cats.map(c => val(m[c[0]], side)), tot = sum(v) || 1;
    return `<div class="stk-row"><span>${name}</span><div class="stk-bar" role="img" aria-label="${esc(name + ': ' + cats.map((c, i) => `${c[1]} ${pct(v[i])}`).join(', '))}">${cats.map((c, i) => `<i class="${side === 'sim' ? 'mine-seg' : ''}" style="flex:${(v[i] || 0) / tot};background-color:${c[2]}" data-tip="<b>${esc(name)}</b>: ${esc(c[1].toLowerCase())} ${pct(v[i])}">${(v[i] || 0) / tot > 0.12 ? pct(v[i]) : ''}</i>`).join('')}</div></div>`;
  };
  const VN = { similar: 'similar', different: 'different', inconclusive: 'too close to call' };
  paint(el, `<div class="stk">${bar('real', 'Taï')}${bar('sim', 'Simulated')}</div>`);
  const leg = fig.querySelector('.gv-legend');
  if (leg) leg.innerHTML = cats.map(c => `<span><i class="gv-sq" style="--k:${c[2]}"></i>${c[1]}: ${VN[m[c[0]] && m[c[0]].verdict] || '—'}</span>`).join('') + '<span>hatched: simulated</span>';
  table(fig, ['Activity', 'Taï', 'Simulated', 'Verdict'], () => cats.map(c => [c[1], pct(val(m[c[0]], 'real')), pct(val(m[c[0]], 'sim')), VN[m[c[0]] && m[c[0]].verdict] || '']));
}

// ---------- Patrols by month of the year, averaged over each site's study years (never matched year to year).
// Gombe comes from year-round daily follows, so it is the fair seasonal reference; Ngogo's months carry its observers'
// field seasons. The simulated line stays "pending" until the patrol proof writes `seasonality.sim`.
function seasonal(fig, [PC]) {
  const el = plotOf(fig), S = PC && PC.seasonality;
  if (!S || !S.gombePatrols || !S.ngogoPatrols) return pending(el, 'The patrol records are not available.');
  const span = y => (Array.isArray(y) && y.length === 2 ? y[1] - y[0] + 1 : null);
  const yg = span(PC.gombe && PC.gombe.years), yn = PC.ngogo && PC.ngogo.perYear ? PC.ngogo.perYear.length : null;
  const tg = sum(S.gombePatrols), tn = sum(S.ngogoPatrols);
  let share = fig.dataset.per === 'share';
  const series = () => [
    { name: 'Gombe', color: 'var(--gombe)', n: S.gombePatrols, v: S.gombePatrols.map(c => (share ? c / tg : c / yg)), years: yg, dash: '', w: 2.4, r: 3.6, op: 1 },
    { name: 'Ngogo', color: 'var(--ngogo)', n: S.ngogoPatrols, v: S.ngogoPatrols.map(c => (share ? c / tn : c / yn)), years: yn, dash: '5 4', w: 1.8, r: 2.8, op: 0.8 },
  ];
  const fmt = v => (share ? pct(v) : v.toFixed(v < 1 ? 2 : 1));
  const draw = () => {
    const W = Math.max(280, el.clientWidth), narrow = W < 480, H = narrow ? 220 : 260, L = 38, R = 12, T = 18, B = 26;
    const ser = series(), mx = maxOf(ser.flatMap(x => x.v));
    const step = share ? 0.05 : mx > 2 ? 1 : 0.5, top = Math.ceil(mx / step) * step;
    const X = m => L + (m + 0.5) / 12 * (W - L - R), Y = v => T + (1 - v / top) * (H - T - B);
    let s = svgOpen(W, H, share ? 'Share of each site\'s patrols in each calendar month: Gombe spread through the year, Ngogo piled up in June and July.' : 'Patrols per month, averaged over the study years, at Gombe and Ngogo.');
    // Ngogo's field season: June and July hold most of its patrols.
    const jj = (S.ngogoPatrols[5] + S.ngogoPatrols[6]) / tn;
    s += `<rect x="${(X(5) - (W - L - R) / 24).toFixed(1)}" y="${T}" width="${((W - L - R) / 6).toFixed(1)}" height="${H - T - B}" fill="rgba(255,255,255,.04)"/>`;
    s += `<text x="${(X(5) - (W - L - R) / 24 + 4).toFixed(1)}" y="${T + 10}" class="gv-note">${narrow ? pct(jj) + ' Ngogo' : pct(jj) + ' of Ngogo patrols'}</text>`;
    for (let v = 0; v <= top + 1e-9; v += step) s += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" class="${v ? 'gv-grid' : 'gv-axis'}"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="gv-tick">${share ? Math.round(v * 100) + '%' : +v.toFixed(1)}</text>`;
    if (share) s += `<line x1="${L}" x2="${W - R}" y1="${Y(1 / 12).toFixed(1)}" y2="${Y(1 / 12).toFixed(1)}" stroke="var(--ink-3)" stroke-dasharray="1 4" stroke-linecap="round"/><text x="${W - R}" y="${(Y(1 / 12) - 5).toFixed(1)}" text-anchor="end" class="gv-note">even through the year</text>`;
    MONTHS.forEach((m, i) => { s += `<text x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" class="gv-tick">${narrow ? m[0] : m}</text>`; });
    ser.slice().reverse().forEach(x => {
      s += `<path d="${x.v.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('')}" fill="none" style="stroke:${x.color}" stroke-width="${x.w}" stroke-opacity="${x.op}" stroke-linejoin="round"${x.dash ? ` stroke-dasharray="${x.dash}"` : ''}/>`;
      x.v.forEach((v, i) => { s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${x.r}" style="fill:${x.color}" fill-opacity="${x.op}" stroke="var(--surface)" stroke-width="1.5" data-tip="<b>${x.name}, ${MONTHS[i]}</b><br>${share ? pct(v, 1) + ' of its patrols' : fmt(v) + ' patrols per month'} (${x.n[i]} in ${x.years} years)"/>`; });
    });
    paint(el, s + '</svg>');
  };
  draw();
  fig.querySelectorAll('[data-per]').forEach(b => { b.onclick = () => { share = b.dataset.per === 'share'; fig.dataset.per = share ? 'share' : 'month'; fig.querySelectorAll('[data-per]').forEach(x => x.setAttribute('aria-selected', String(x === b))); draw(); }; });
  const hi = a => MONTHS[a.indexOf(Math.max(...a))], lo = a => MONTHS[a.indexOf(Math.min(...a))];
  set(fig, 'sub', `Averaged over ${yg} years at Gombe (${nf.format(tg)} patrols) and ${yn} at Ngogo (${nf.format(tn)}). Gombe patrols most in ${hi(S.gombePatrols)} and least in ${lo(S.gombePatrols)}, and no month is empty. At Ngogo, ${pct((S.ngogoPatrols[5] + S.ngogoPatrols[6]) / tn)} of patrols fall in June and July, which mostly reflects when observers were in the field.`);
  const leg = fig.querySelector('.gv-legend');
  if (leg) leg.innerHTML = `<span><i class="gv-sw" style="--k:var(--gombe)"></i>Gombe, daily follows all year</span><span><i class="gv-sw dash" style="--k:var(--ngogo)"></i>Ngogo, observed patrols only</span>` +
    // No simulated line is drawn until the proof defines one; the legend says so rather than guessing a shape.
    '<span class="gv-pending">Simulated: pending until the patrol proof runs</span>';
  table(fig, ['Month', 'Gombe patrols', 'Gombe per month', 'Ngogo patrols', 'Ngogo per month'], () => MONTHS.map((m, i) => [m, S.gombePatrols[i], (S.gombePatrols[i] / yg).toFixed(2), S.ngogoPatrols[i], (S.ngogoPatrols[i] / yn).toFixed(2)]));
}

// ---------- Per-male participation as a beeswarm.
function males(fig, [PT]) {
  const el = plotOf(fig);
  if (!PT) return pending(el, 'The patrol records are not available.');
  const W = Math.max(280, el.clientWidth), narrow = W < 560, labW = narrow ? 0 : 118, L = labW + 8, R = 14, rr = narrow ? 3.6 : 4.4;
  const X = v => L + v * (W - L - R);
  const lanes = [['Gombe', 'var(--gombe)', PT.gombe], ['Ngogo', 'var(--ngogo)', PT.ngogo]];
  const swarm = vals => { const placed = []; return vals.map(v => { const x = X(v); let k = 0, y = 0; for (;;) { y = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (rr * 2 + 1); if (!placed.some(p => Math.abs(p[0] - x) < rr * 2 + 0.5 && Math.abs(p[1] - y) < rr * 2 + 0.5)) break; k++; } placed.push([x, y]); return [x, y]; }); };
  const laid = lanes.map(l => swarm(l[2].shares)), spans = laid.map(p => Math.max(rr * 2, ...p.map(q => Math.abs(q[1]) + rr)));
  let y = 10, s = '';
  lanes.forEach(([name, color, d], i) => {
    const h = spans[i] * 2 + (narrow ? 26 : 10), cy = y + (narrow ? 18 : 0) + h / 2 - (narrow ? 9 : 0);
    s += `<text x="0" y="${narrow ? y + 10 : cy - 4}" class="gv-lab hi">${name}</text><text x="${narrow ? 64 : 0}" y="${narrow ? y + 10 : cy + 11}" class="gv-note">${d.males} males</text>`;
    laid[i].forEach((p, j) => { s += `<circle cx="${p[0].toFixed(1)}" cy="${(cy + p[1]).toFixed(1)}" r="${rr}" style="fill:${color}" fill-opacity=".9" stroke="var(--surface)" stroke-width="1.5" data-tip="${name}: one male joined <b>${pct(d.shares[j])}</b>"/>`; });
    s += `<line x1="${X(d.median)}" x2="${X(d.median)}" y1="${cy - spans[i] - 4}" y2="${cy + spans[i] + 4}" stroke="var(--ink)" stroke-width="1.5"/><text x="${X(d.median) + 5}" y="${cy - spans[i] - 5}" class="gv-lab hi">median ${pct(d.median)}</text>`;
    y += h + 18;
  });
  s += `<text x="0" y="${y + 4}" class="gv-lab hi">Simulated</text><rect x="${L}" y="${y - 8}" width="${W - L - R}" height="16" rx="3" fill="none" stroke="var(--line-3)" stroke-dasharray="3 3"/><text x="${L + (W - L - R) / 2}" y="${y + 4}" text-anchor="middle" class="gv-note">pending: the patrol proof has not run</text>`;
  y += 30;
  s += `<line x1="${L}" x2="${W - R}" y1="${y - 10}" y2="${y - 10}" class="gv-axis"/>` + [0, 0.25, 0.5, 0.75, 1].map(v => `<text x="${X(v)}" y="${y + 4}" text-anchor="middle" class="gv-tick">${v * 100}%</text>`).join('');
  paint(el, svgOpen(W, y + 12, `Share of patrols each male joined: Gombe median ${pct(PT.gombe.median)} of ${PT.gombe.males} males, Ngogo median ${pct(PT.ngogo.median)} of ${PT.ngogo.males}.`) + s + '</svg>');
  set(fig, 'sub', `Gombe: ${PT.gombe.rule}, ${PT.gombe.years.join('–')}. Ngogo: ${PT.ngogo.rule}, ${PT.ngogo.years.join('–')}. One dot per male, no names.`);
  table(fig, ['Site', 'Males', 'Median', 'Lowest', 'Highest'], () => lanes.map(([n, , d]) => [n, d.males, pct(d.median), pct(d.shares[0]), pct(d.shares[d.shares.length - 1])]));
}

// ---------- Numbers in the ranging lead paragraph (size-matched range gap).
function rvlead(el, [V]) {
  const t = V && V.targets.find(x => x.id === 'T-RNG-1');
  if (!t || !t.range || !fin(t.mean)) return;
  set(el, 'sizeRatio', (t.range.lo / t.mean).toFixed(1) + '×');
  set(el, 'rng1', `${num(t.mean, 1)} km² against ${t.range.lo}–${t.range.hi} km²`);
}

// ================================================================================================ mounting
const COMPONENTS = {
  pipeline: { need: ['validation'], draw: pipeline },
  datasets: { need: ['validation'], draw: datasets },
  validation: { need: ['validation'], draw: validation },
  behaviours: { need: ['validation'], draw: behaviours, responsive: true },
  fruit: { need: ['fruit'], draw: fruit, responsive: true },
  species: { need: ['fruit'], draw: species },
  paths: { need: ['paths'], draw: paths, responsive: true },
  turns: { need: ['movement', 'gombe'], draw: turns, responsive: true },
  scale: { need: ['ranging', 'movement', 'validation'], draw: scale },
  activity: { need: ['movement'], draw: activity },
  seasonal: { need: ['patrol'], draw: seasonal, responsive: true },
  males: { need: ['patrols'], draw: males, responsive: true },
  rvlead: { need: ['validation'], draw: rvlead },
};

function mount(fig) {
  const c = COMPONENTS[fig.dataset.gv]; if (!c || fig.dataset.gvState) return;
  fig.dataset.gvState = 'loading';
  Promise.all(c.need.map(load)).then(data => {
    try { c.draw(fig, data); fig.dataset.gvState = 'done'; } catch (e) { console.error('guide figure ' + fig.dataset.gv, e); pending(plotOf(fig), 'This figure could not be drawn.'); fig.dataset.gvState = 'error'; return; }
    if (!c.responsive || !('ResizeObserver' in window)) return;
    let w = plotOf(fig).clientWidth, raf = 0;
    new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const nw = plotOf(fig).clientWidth; if (Math.abs(nw - w) > 8) { w = nw; c.draw(fig, data); } }); }).observe(plotOf(fig));
  });
}

const figs = [...document.querySelectorAll('[data-gv]')];
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); mount(e.target); } }), { rootMargin: '600px 0px' });
  figs.forEach(f => io.observe(f));
} else figs.forEach(mount);
// Printing (or a hash jump far down the page) should not leave blanks.
window.addEventListener('beforeprint', () => figs.forEach(mount));
