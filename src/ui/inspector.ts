import type { Ctx } from './app';
import type { Action, Chimp, MemoryDigest, Relationship, World } from '../types';
import type { InspectorTab } from './contracts';
import { icon } from './icons';
import { actionVerb, ageText, ago, cap, duration, esc, feedCat, interactionCat, nameOf, pct, RELATION_LABEL, relationClass, sinceText, stamp, troopOf, troopShort } from './format';
import { bar, chip, empty, meter, radar, rankBadge, troopChip } from './parts';
import { mindHtml, mindKey } from './mind';
import { egoTreeSvg } from './family-tree';
import { egoNetworkSvg, relationLegend } from './graph';
import { alphaTimelineSvg, ladderHtml, tenureListHtml } from './hierarchy';
import { emblem } from './communities';
import { CAT_ICON } from './feed';
import { morph } from './morph';

// Right-hand inspector: identity header + five tabs. Each tab renders only
// when its content key changes; focus, <details> state and scroll survive.

const TABS: { id: InspectorTab; label: string; ic: string }[] = [
  { id: 'overview', label: 'Overview', ic: 'person' }, { id: 'mind', label: 'Mind', ic: 'brain' }, { id: 'family', label: 'Family', ic: 'tree' },
  { id: 'social', label: 'Social', ic: 'network' }, { id: 'hierarchy', label: 'Rank', ic: 'ladder' },
];

const ACTION_ICON: Partial<Record<Action, string>> = {
  rest: 'zzz', nest: 'zzz', forage: 'fig', drink: 'drop', travel: 'chevronR', follow: 'chevronR', groom: 'heart', play: 'paw', climb: 'canopy',
  patrol: 'flag', display: 'swords', charge: 'swords', attack: 'swords', flee: 'bolt', hunt: 'meat', share: 'meat', beg: 'meat',
  mate: 'heart', consort: 'heart', guard: 'eye', nurse: 'sprout', 'pant-grunt': 'crown', submit: 'down', reconcile: 'heart', console: 'heart',
  shelter: 'rain', call: 'speaker', alarm: 'speaker', transfer: 'arrowUR', dead: 'dagger',
};

/**
 * Patch a panel to new markup (see morph.ts): unchanged nodes are kept, so focus, open <details> and scroll
 * survive. When a focused or <details> node had to be re-created anyway, its state is restored by key.
 */
export function renderInto(el: HTMLElement, html: string) {
  const active = document.activeElement as HTMLElement | null;
  const focusKey = active && el.contains(active) ? active.dataset.focusKey ?? (active.dataset.select ? `sel-${active.dataset.select}` : active.dataset.trace ? `tr-${active.dataset.trace}` : active.dataset.act ? `act-${active.dataset.act}` : null) : null;
  const details = el.querySelectorAll<HTMLDetailsElement>('details[data-keep]');
  const open = details.length ? new Map([...details].map(d => [d.dataset.keep!, d.open])) : null;
  morph(el, html);
  if (open) for (const d of el.querySelectorAll<HTMLDetailsElement>('details[data-keep]')) { const o = open.get(d.dataset.keep!); if (o !== undefined && d.open !== o) d.open = o; }
  if (focusKey && !(active && el.contains(active))) {
    const [kind, v] = [focusKey.split('-')[0], focusKey.slice(focusKey.indexOf('-') + 1)];
    const target = el.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(focusKey)}"]`)
      ?? (kind === 'sel' ? el.querySelector<HTMLElement>(`[data-select="${CSS.escape(v)}"]`) : kind === 'tr' ? el.querySelector<HTMLElement>(`[data-trace="${CSS.escape(v)}"]`) : kind === 'act' ? el.querySelector<HTMLElement>(`[data-act="${CSS.escape(v)}"]`) : null);
    target?.focus({ preventScroll: true });
  }
}

function overviewHtml(ctx: Ctx, c: Chimp): string {
  const w = ctx.world();
  const tn = c.targetId >= 0 ? nameOf(w, c.targetId) : '';
  const targetLabel = c.targetId >= 0 && w.chimps.some(x => x.id === c.targetId) ? tn : c.targetId >= 0 ? (w.trees.find(t => t.id === c.targetId)?.common ?? (w.water.some(x => x.id === c.targetId) ? 'water' : '')) : '';
  const status: string[] = [];
  status.push(chip(cap(c.mood), `mood-${c.mood}`, 'Current mood'));
  if (c.sex === 'female' && c.cycleDay >= 0) status.push(chip(`Swelling ${pct(c.swelling)}%${c.swelling > 0.9 ? ' · maximal' : ''}`, c.swelling > 0.9 ? 'swell max' : 'swell', `Anogenital swelling; cycle day ${c.cycleDay}`));
  if (c.pregnancy > 0) status.push(chip(`Pregnant · ${pct(c.pregnancy)}%`, 'life', 'Gestation progress (~7.5 months total)'));
  if (c.lactating) status.push(chip('Lactating', 'life', 'Nursing a dependent infant; cycling suppressed'));
  if (c.injury > 0.02) status.push(chip(`Injured ${pct(c.injury)}%`, 'bad', 'Wound severity; slows movement, heals over days'));
  if (c.carryingMeat > 0) status.push(chip('Holding meat', 'hunt'));
  if (c.vocal) status.push(chip(`${icon('speaker')}${esc(c.vocal)}`, 'vocal'));
  if (c.nest) status.push(chip('In nest', ''));
  const needs = [
    meter('Hunger', c.hunger, 'need'), meter('Thirst', c.thirst, 'need'), meter('Energy', c.energy, 'good'), meter('Social need', 1 - c.social, 'need'),
    meter('Stress', c.stress, 'neg'), meter('Health', c.health, 'good'), ...(c.injury > 0.01 ? [meter('Injury', c.injury, 'neg')] : []),
  ];
  const episodes = [...(c.episodes ?? [])].sort((a, b) => b.time - a.time).slice(0, 5);
  return `<div class="ov">
    <section class="now ${c.decisionSource === 'decide' ? 'by-model' : ''}">
      <div class="now-top"><span class="now-ic">${icon(ACTION_ICON[c.action] ?? 'leaf')}</span>
        <div class="now-txt"><b>${esc(actionVerb(c.action))}${targetLabel ? ` <i>→ ${esc(targetLabel)}</i>` : ''}</b><span class="now-meta">${c.alive ? ((c.actionTime ?? 0) < 60 ? 'Now · just started' : `Now · for ${duration((c.actionTime ?? 0) / 3600)}`) : c.deathTime !== null ? `Died ${stamp(w, c.deathTime)}` : ''}</span></div>
        <span class="src ${c.decisionSource === 'decide' ? 'model' : ''}" title="Who picked the current action">${c.decisionSource === 'decide' ? `${icon('spark')}GLiNER` : 'Rules'}</span></div>
      <p class="now-reason">${esc(c.alive ? c.reason : `Cause of death: ${c.causeOfDeath ?? 'unknown'}`)}</p>
      <div class="chips">${status.join('')}</div>
    </section>
    <section class="blk"><h3 class="eyebrow">Internal state <span class="muted">0–100</span></h3><div class="needs">${needs.join('')}</div></section>
    <section class="blk two">
      <div><h3 class="eyebrow">Personality</h3>${radar(c.personality)}</div>
      <div><h3 class="eyebrow">Skills</h3><div class="skills">${Object.entries(c.skills).map(([k, v]) => meter(cap(k), v, 'skill')).join('')}</div></div>
    </section>
    ${episodes.length ? `<section class="blk"><h3 class="eyebrow">Recent episodes</h3><ol class="diary">${episodes.map(e => `<li class="k-${e.kind}"><span class="mono">${ago(w, e.time)}</span>${esc(e.text)}</li>`).join('')}</ol></section>` : ''}
    <p class="honest">Needs, personality and skills are simulation state (illustrative, uncalibrated).</p>
  </div>`;
}

function familyHtml(ctx: Ctx, c: Chimp): string {
  const w = ctx.world();
  const mother = w.chimps.find(x => x.id === c.motherId), sire = w.chimps.find(x => x.id === c.fatherId);
  const offspring = w.chimps.filter(x => x.motherId === c.id || x.fatherId === c.id);
  const sibs = c.motherId >= 0 ? w.chimps.filter(x => x.motherId === c.motherId && x.id !== c.id) : [];
  const natal = troopOf(w, c.natalTroopId);
  return `<div class="fam">
    <div class="kin-wrap">${egoTreeSvg(w, c, 340)}</div>
    <div class="legend"><span class="lg-shape"><b class="sq"></b>male <b class="ci"></b>female</span><span><i class="ln mat"></i>mother</span><span><i class="ln sire"></i>genetic sire</span><span><b class="dead-mk">†</b>deceased</span><span><b class="imm-mk">↘</b>immigrant</span></div>
    <dl class="facts-dl">
      <div><dt>Mother</dt><dd>${mother ? `<button class="lnk" data-select="${mother.id}">${esc(mother.name)}</button>${mother.alive ? '' : ' †'}` : 'Unknown (founder)'}</dd></div>
      <div><dt>Genetic sire</dt><dd>${sire ? `<button class="lnk" data-select="${sire.id}">${esc(sire.name)}</button>${sire.alive ? '' : ' †'}` : 'Unknown'}</dd></div>
      <div><dt>Maternal siblings</dt><dd>${sibs.length ? `${sibs.filter(s => s.alive).length} of ${sibs.length} living` : 'None'}</dd></div>
      <div><dt>Offspring</dt><dd>${offspring.length ? `${offspring.filter(s => s.alive).length} of ${offspring.length} living` : 'None'}</dd></div>
      <div><dt>Natal community</dt><dd>${natal ? `${troopChip(natal)}${c.natalTroopId !== c.troopId ? ' <span class="muted">immigrated</span>' : ''}` : '—'}</dd></div>
    </dl>
    <p class="honest">Chimpanzees recognise maternal kin. The sire is genetic ground truth from the simulation; the chimps themselves do not know paternity.</p>
  </div>`;
}

/** Tension at which a community member reads as a rival; mirrors the simulation's rival threshold (src/sim/relations.ts). */
// Fallback only when relationshipOf is unavailable (preview); real worlds report their own threshold.
const RIVAL_TENSION_FALLBACK = 0.35;

interface RelRow { o: Chimp; bond: number; tension: number | null; r?: Relationship }

/** Partners worth listing: the strongest bonds, then anyone at rival-level tension who is not among them. */
function relationshipRows(ctx: Ctx, c: Chimp): RelRow[] {
  const w = ctx.world(), relOf = ctx.deps.relationshipOf;
  if (!relOf) {
    const rows: RelRow[] = [];
    for (const [id, v] of Object.entries(c.bonds ?? {})) { const o = w.chimps.find(x => x.id === Number(id)); if (o?.alive && v > 0.02) rows.push({ o, bond: v, tension: null }); }
    return rows.sort((a, b) => b.bond - a.bond).slice(0, 8);
  }
  const ids = new Set(Object.keys(c.bonds ?? {}).map(Number));
  for (const x of w.chimps) if (x.alive && x.troopId === c.troopId) ids.add(x.id);
  const rows: RelRow[] = [];
  for (const id of ids) {
    const o = w.chimps.find(x => x.id === id);
    if (!o || !o.alive || o.id === c.id) continue;
    const r = relOf(w, c, o);
    rows.push({ o, bond: r.bond, tension: r.tension, r });
  }
  const top = rows.filter(x => x.bond > 0.02).sort((a, b) => b.bond - a.bond).slice(0, 8);
  const rivals = rows.filter(x => (x.tension ?? 0) >= (x.r?.rivalAt ?? RIVAL_TENSION_FALLBACK) && !top.includes(x)).sort((a, b) => (b.tension ?? 0) - (a.tension ?? 0)).slice(0, 4);
  return [...top, ...rivals];
}

/** Plain-language hover detail for one relationship row. */
function relTitle(ctx: Ctx, row: RelRow): string {
  const w = ctx.world(), r = row.r;
  const parts = [`Bond ${pct(row.bond)}${row.tension !== null ? ` · tension ${pct(row.tension)}${row.tension >= (row.r?.rivalAt ?? RIVAL_TENSION_FALLBACK) ? ' (rival level)' : ''}` : ''}`];
  if (r?.lastIncident) parts.push(`last ${r.lastIncident.kind} ${r.lastIncident.direction} ${ago(w, r.lastIncident.time)}`);
  const m = r?.counts.month, bits: string[] = [];
  if (m) {
    const g = (m.groomGiven ?? 0) + (m.groomReceived ?? 0), th = (m.threatsGiven ?? 0) + (m.threatsReceived ?? 0), at = (m.attacksGiven ?? 0) + (m.attacksReceived ?? 0);
    if (g >= 0.1) bits.push(`groomed ${g.toFixed(1)} h`);
    if (th) bits.push(`${th} threat${th > 1 ? 's' : ''}`);
    if (at) bits.push(`${at} attack${at > 1 ? 's' : ''}`);
    if (m.supportGiven || m.supportReceived) bits.push('coalition support');
    if (m.reconciliations) bits.push(`${m.reconciliations} reconciliation${m.reconciliations > 1 ? 's' : ''}`);
  }
  if (bits.length) parts.push(`this month: ${bits.join(', ')}`);
  return parts.join(' · ');
}

/** Monthly digests newest first, then the yearly ones; each is one compact line. */
function memoryHtml(w: World, c: Chimp): string {
  const ds = [...(c.digests ?? [])].reverse();
  if (!ds.length) return `<p class="subtle">No digest yet. A monthly summary closes every 30 ecological days${w.ageRate !== 1 ? '; in life-course mode digests still follow ecological time, so there are few' : ''}.</p>`;
  const age = (a: number) => `${a < 10 ? a.toFixed(1) : Math.floor(a)} y`;
  const row = (d: MemoryDigest) => {
    const i = d.text.indexOf(': '), when = i > 0 ? d.text.slice(0, i) : d.period === 'year' ? 'Year' : 'Month', body = i > 0 ? d.text.slice(i + 2) : d.text;
    return `<li class="${d.period}"><span class="mt-when">${esc(when)}<i>age ${age(d.age)}</i></span><span class="mt-text">${esc(cap(body))}</span></li>`;
  };
  const months = ds.filter(d => d.period === 'month'), years = ds.filter(d => d.period === 'year');
  return `<ol class="memtl">${months.map(row).join('')}${years.length ? `<li class="mt-sep">Earlier years</li>${years.map(row).join('')}` : ''}</ol>`;
}

function socialHtml(ctx: Ctx, c: Chimp): string {
  const w = ctx.world();
  const rows = relationshipRows(ctx, c), hasTension = rows.some(r => r.tension !== null);
  const allies = (c.allies ?? []).map(id => w.chimps.find(x => x.id === id)).filter((x): x is Chimp => !!x);
  const inter = w.interactions.filter(i => i.participants?.includes(c.id) || i.actorId === c.id || i.targetId === c.id).sort((a, b) => b.start - a.start).slice(0, 6);
  const evs = w.events.filter(e => e.actors?.includes(c.id)).slice(-6).reverse();
  const ego = egoNetworkSvg(w, c, ctx.deps.relationOf, 340, 230);
  return `<div class="soc">
    ${ego ? `<div class="ego-wrap">${ego}</div>${relationLegend()}` : ''}
    <section class="blk"><h3 class="eyebrow">Relationships <span class="muted">0–100${hasTension ? ` · rival at ${Math.round((rows.find(x => x.r)?.r?.rivalAt ?? RIVAL_TENSION_FALLBACK) * 100)} tension` : ''}</span></h3>${rows.length ? `<div class="bonds-head${hasTension ? ' t' : ''}" aria-hidden="true"><span>Individual</span><span></span><span>Bond</span>${hasTension ? '<span>Tension</span>' : ''}</div><ol class="bonds${hasTension ? ' t' : ''}">${rows.map(b => {
      const rel = ctx.deps.relationOf(w, c, b.o), rival = (b.tension ?? 0) >= (b.r?.rivalAt ?? RIVAL_TENSION_FALLBACK);
      return `<li><button data-select="${b.o.id}" title="${esc(relTitle(ctx, b))}"><span class="b-name"><em>${b.o.sex === 'male' ? '♂' : '♀'}</em>${esc(b.o.name)}</span><span class="rel ${relationClass(rel)}">${RELATION_LABEL[rel]}</span><span class="b-val">${bar(b.bond, `rel-${relationClass(rel)}`, 'Bond')}<b class="mono">${pct(b.bond)}</b></span>${b.tension !== null ? `<span class="b-val tension${rival ? ' rival' : ''}">${bar(b.tension, rival ? 'bad' : 'tension', 'Tension')}<b class="mono">${pct(b.tension)}</b></span>` : ''}</button></li>`;
    }).join('')}</ol>` : '<p class="subtle">No bonds above the noise floor yet. Bonds grow through grooming, play and shared travel.</p>'}</section>
    ${allies.length ? `<section class="blk"><h3 class="eyebrow">Coalition allies</h3><div class="ally-row">${allies.map(a => `<button class="pal" data-select="${a.id}">${icon('link')}${esc(a.name)}${a.alive ? '' : ' †'}</button>`).join('')}</div></section>` : ''}
    ${c.lastConflict ? `<section class="blk"><h3 class="eyebrow">Last conflict</h3><p class="conf ${c.lastConflict.won ? 'won' : 'lost'}">${c.lastConflict.won ? 'Won against' : 'Lost to'} <button class="lnk" data-select="${c.lastConflict.opponentId}">${esc(nameOf(w, c.lastConflict.opponentId))}</button> · ${ago(w, c.lastConflict.time)}</p></section>` : ''}
    <section class="blk"><h3 class="eyebrow">Recent interactions</h3>${inter.length || evs.length ? `<ol class="inter">
      ${inter.map(i => { const other = i.actorId === c.id ? i.targetId : i.actorId; const cat = interactionCat(i.kind); return `<li class="k-${cat}"><span class="ev-ic">${icon(CAT_ICON[cat])}</span><span>${esc(cap(i.kind.replace('-', ' ')))}${other >= 0 && other !== c.id ? ` ${i.actorId === c.id ? '→' : '←'} <button class="lnk" data-select="${other}">${esc(nameOf(w, other))}</button>` : ''}</span><span class="mono muted">${i.end === null ? 'ongoing' : ago(w, i.start)}</span></li>`; }).join('')}
      ${evs.map(e => `<li class="k-${feedCat(e.kind)}"><span class="ev-ic">${icon(CAT_ICON[feedCat(e.kind)])}</span><span>${esc(e.text)}</span><span class="mono muted">${ago(w, e.time)}</span></li>`).join('')}
    </ol>` : '<p class="subtle">No interactions recorded in the recent window.</p>'}</section>
    ${c.digests !== undefined || ctx.deps.relationshipOf ? `<section class="blk"><h3 class="eyebrow">Social memory <span class="muted">monthly, then yearly</span></h3>${memoryHtml(w, c)}</section>` : ''}
    <p class="honest">Bond is relationship value (grooming, support, kinship); tension is recent aggression not yet repaired, fading with a 21-day half-life. Both are simulation state, illustrative and uncalibrated.</p>
  </div>`;
}

function hierarchyHtml(ctx: Ctx, c: Chimp): string {
  const w = ctx.world(), t = troopOf(w, c.troopId);
  if (!t) return empty('No community', 'This individual has no community record.');
  const alpha = w.chimps.find(x => x.id === t.alphaId);
  return `<div class="hier">
    <section class="alpha-card" style="--c:${esc(t.color)}">${icon('crown')}<div><b>${alpha ? `<button class="lnk" data-select="${alpha.id}">${esc(alpha.name)}</button>` : 'Vacant'}</b><span class="ac-meta">${esc(troopShort(t))} alpha${alpha ? ` · ${t.alphaSince < 0 ? '≥ ' : ''}${duration(w.time - t.alphaSince)}, ${sinceText(w, t.alphaSince)}` : ' · contested, no male holds the position'}</span></div></section>
    <section class="blk"><h3 class="eyebrow">Males <span class="muted">Elo score</span></h3>${ladderHtml(w, t, 'male', c.id, ctx.ranks, true)}</section>
    <section class="blk"><h3 class="eyebrow">Females <span class="muted">Elo score</span></h3>${ladderHtml(w, t, 'female', c.id, ctx.ranks, true)}</section>
    <section class="blk"><h3 class="eyebrow">Alpha tenures</h3>${alphaTimelineSvg(w, [t], c.id, 340)}${tenureListHtml(w, t)}</section>
    <p class="honest">Elo scores update from decided agonistic interactions (progressive Elo). Females' ladders are shallower and less linear in the wild.</p>
  </div>`;
}

export function createInspector(root: HTMLElement, ctx: Ctx) {
  root.innerHTML = `<header class="insp-head"></header>
  <div class="tabs" role="tablist" aria-label="Inspector">${TABS.map(t => `<button role="tab" id="tab-${t.id}" data-tab="${t.id}" aria-controls="insp-panel">${icon(t.ic)}<span>${t.label}</span></button>`).join('')}</div>
  <div class="insp-body" id="insp-panel" role="tabpanel" tabindex="0"></div>`;
  const head = root.querySelector<HTMLElement>('.insp-head')!, body = root.querySelector<HTMLElement>('.insp-body')!, tabs = root.querySelector<HTMLElement>('.tabs')!;
  tabs.addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]'); if (b) ctx.setTab(b.dataset.tab as InspectorTab); });
  tabs.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex(t => t.id === ctx.state.tab), n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    ctx.setTab(n.id); tabs.querySelector<HTMLElement>(`[data-tab="${n.id}"]`)?.focus(); e.preventDefault();
  });
  root.addEventListener('click', e => {
    const el = e.target as HTMLElement;
    const sel = el.closest<HTMLElement>('[data-select]'); if (sel && !(sel as HTMLButtonElement).disabled) { ctx.select(Number(sel.dataset.select), { focus: e.detail > 1 }); return; }
    const tr = el.closest<HTMLElement>('[data-trace]'); if (tr) { ctx.state.pinnedTraceId = tr.dataset.trace!; ctx.refresh(); return; }
    const act = el.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'focus') ctx.deps.getScene()?.focusChimp(ctx.state.selectedId);
    else if (act === 'prev' || act === 'next') ctx.cycle(act === 'next' ? 1 : -1);
    else if (act === 'follow') { ctx.state.pinnedTraceId = null; ctx.refresh(); }
    else if (act === 'clear-exp') { ctx.state.experiment = null; ctx.refresh(); }
    else if (act === 'close-sheet') { ctx.state.mobileSheet = false; ctx.refresh(); }
    else if (act === 'collapse') ctx.setInspector(false);
  });
  root.addEventListener('keydown', e => {
    const g = (e.target as HTMLElement).closest<HTMLElement>('g[data-select]');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ctx.select(Number(g.dataset.select)); }
  });
  root.addEventListener('change', e => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.act === 'control') ctx.setModelControl(el.checked);
  });
  let headKey = '', bodyKey = '', tabKey = '', scrolled = 0, renderedAt = -1e9;
  body.addEventListener('scroll', () => { scrolled = body.scrollTop; }, { passive: true });
  return {
    update(force = false) {
      const w = ctx.world(), c = ctx.selected();
      if (!c) { renderInto(body, empty('Nobody selected', 'Click a chimp in the forest, the map or the field log.', 'person')); return; }
      const t = troopOf(w, c.troopId);
      const hk = [c.id, c.name, c.alive, c.stage, Math.floor(c.age * 10), c.troopId, t?.alphaId, (c.sex === 'male' ? t?.maleHierarchy : t?.femaleHierarchy)?.indexOf(c.id), c.controller, w.modelPolicy.mode].join('|');
      if (force || hk !== headKey) {
        headKey = hk;
        const controlled = c.controller === 'model' && w.modelPolicy.mode !== 'off';
        renderInto(head, `<div class="ih-row">${t ? emblem(t, 'lg') : ''}<div class="ih-id">
          <h2 class="ih-name">${esc(c.name)}${c.alive ? '' : ' <span class="dagger">†</span>'}</h2>
          <p class="ih-meta">${cap(c.stage)} ${c.sex} · ${ageText(c)}${t ? ` · ${esc(troopShort(t))}` : ''}${c.natalTroopId !== c.troopId ? ' · immigrant' : ''}</p></div>
          <div class="ih-actions"><button class="icon-btn" data-act="prev" aria-label="Previous in community ([)" title="Previous in community ([)">${icon('chevronL')}</button><button class="icon-btn" data-act="next" aria-label="Next in community (])" title="Next in community (])">${icon('chevronR')}</button><button class="icon-btn" data-act="focus" aria-label="Focus camera (F)" title="Focus camera (F)">${icon('focus')}</button><button class="icon-btn insp-collapse" data-act="collapse" aria-label="Collapse inspector (I)" title="Collapse inspector (I)">${icon('chevronR')}</button><button class="icon-btn sheet-close" data-act="close-sheet" aria-label="Close inspector">${icon('down')}</button></div></div>
          <div class="ih-badges">${rankBadge(w, c)}${controlled ? `<span class="ctl-badge">${icon('spark')}GLiNER-controlled</span>` : '<span class="ctl-badge rules">Rules</span>'}<span class="ih-no mono" title="Individual number">#${String(c.id).padStart(3, '0')}</span></div>`);
      }
      const tk = ctx.state.tab;
      if (tk !== tabKey || force) { tabKey = tk; tabs.querySelectorAll<HTMLElement>('[data-tab]').forEach(b => { const on = b.dataset.tab === tk; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }); body.setAttribute('aria-labelledby', `tab-${tk}`); }
      let bk: string, html: () => string;
      switch (tk) {
        case 'mind': bk = mindKey(ctx, c); html = () => mindHtml(ctx, c); break;
        case 'family': bk = [c.id, w.chimps.length, w.chimps.filter(x => !x.alive).length, Math.floor(w.time / 24)].join('|'); html = () => familyHtml(ctx, c); break;
        case 'social': bk = [c.id, Math.floor(w.time * 4), w.interactions.length, w.events.length, c.digests?.length ?? 0].join('|'); html = () => socialHtml(ctx, c); break;
        case 'hierarchy': bk = [c.id, w.troops.map(tt => [tt.alphaId, tt.maleHierarchy.join(','), tt.femaleHierarchy.join(',')].join(';')).join('/'), Math.floor(w.time)].join('|'); html = () => hierarchyHtml(ctx, c); break;
        default: bk = [c.id, c.action, c.targetId, c.reason, c.mood, c.alive, Math.round(c.hunger * 50), Math.round(c.thirst * 50), Math.round(c.energy * 50), Math.round(c.social * 50), Math.round(c.stress * 50), Math.round(c.health * 50), Math.round(c.injury * 50), Math.round(c.swelling * 20), c.lactating, c.pregnancy > 0, c.carryingMeat > 0, c.vocal, c.episodes?.length, c.decisionSource, Math.floor((c.actionTime ?? 0) / 60)].join('|'); html = () => overviewHtml(ctx, c);
      }
      bk = `${tk}:${bk}`;
      if (force || bk !== bodyKey) {
        const sameChimpTab = bodyKey.split(':')[0] === tk && bodyKey.split('|')[0] === bk.split('|')[0];
        // Dense tabs (trees, networks, ladders, decision history) redraw at most once a second when only
        // their data moved, the overview twice a second above 1 h/s; a new chimp, tab or user action renders at once.
        const now = performance.now();
        const fast = ctx.deps.clock.playing && ctx.deps.clock.effectiveRate > 3600, gap = tk !== 'overview' ? 1000 : fast ? 500 : 0;
        if (!force && sameChimpTab && now - renderedAt < gap) return;
        bodyKey = bk; renderedAt = now; renderInto(body, html());
        // Patching keeps the container's scroll offset, so a same-view refresh needs no scroll read or
        // write (either would force layout). Only a new chimp or tab resets to the top, using the offset
        // tracked by the scroll listener.
        if (!sameChimpTab && scrolled > 0) { body.scrollTop = 0; scrolled = 0; }
      }
    },
  };
}
