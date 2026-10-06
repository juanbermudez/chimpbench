import type { Ctx } from './app';
import type { Action, Chimp, MemoryDigest, Relationship, World } from '../types';
import type { InspectorTab } from './contracts';
import { icon } from './icons';
import { actionVerb, ageText, ago, cap, duration, esc, feedCat, interactionCat, nameOf, pct, RELATION_LABEL, relationClass, stamp, troopOf, troopShort } from './format';
import { alphaBadge, bar, chip, empty, meter, radar, troopChip } from './parts';
import { mindHtml, mindKey } from './mind';
import { egoTreeSvg } from './family-tree';
import { egoNetworkSvg, relationLegend } from './graph';
import { CAT_ICON } from './feed';
import { CHIMP_LOG_MAX, chimpEvents } from './chimp-log';
import { morph, setAttr, setText } from './morph';

// Bottom chimp panel: the selected animal at the foot of the forest, between the left column and the right sidebar.
// An identity column (a small square snapshot, name, community, key details, what it is doing) beside five tabs:
// Overview, Log (the field log filtered to this animal), Mind, Family and Relations. I collapses the panel to a
// one-line strip. Each tab renders only when its content key changes, and only while the panel is expanded; focus,
// <details> state and scroll survive a refresh.

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'log', label: 'Log' }, { id: 'mind', label: 'Mind' }, { id: 'family', label: 'Family' }, { id: 'social', label: 'Relations' },
];

const ACTION_ICON: Partial<Record<Action, string>> = {
  rest: 'zzz', nest: 'zzz', forage: 'fig', drink: 'drop', travel: 'chevronR', follow: 'chevronR', groom: 'heart', play: 'paw', climb: 'canopy',
  patrol: 'flag', display: 'swords', charge: 'swords', attack: 'swords', flee: 'bolt', hunt: 'meat', share: 'meat', beg: 'meat',
  mate: 'heart', consort: 'heart', guard: 'eye', nurse: 'sprout', 'pant-grunt': 'ladder', submit: 'down', reconcile: 'heart', console: 'heart',
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

/** The overview's one-line state: "Traveling · 17 min", or when and how the animal died. */
export function nowLine(w: World, c: Chimp): string {
  if (!c.alive) return `Died ${c.deathTime !== null ? stamp(w, c.deathTime) : ''}${c.causeOfDeath ? ` · ${c.causeOfDeath}` : ''}`.trim();
  const t = c.actionTime ?? 0;
  return `${actionVerb(c.action)} · ${t < 60 ? 'just started' : duration(t / 3600)}`;
}

/** Tags beside the state meters: mood, cycle, pregnancy, injury, meat, calls, nest. */
function statusChips(c: Chimp): string[] {
  const status: string[] = [chip(cap(c.mood), `mood-${c.mood}`, 'Current mood')];
  if (c.sex === 'female' && c.cycleDay >= 0) status.push(chip(`Swelling ${pct(c.swelling)}%${c.swelling > 0.9 ? ' · maximal' : ''}`, c.swelling > 0.9 ? 'swell max' : 'swell', `Anogenital swelling; cycle day ${c.cycleDay}`));
  if (c.pregnancy > 0) status.push(chip(`Pregnant · ${pct(c.pregnancy)}%`, 'life', 'Gestation progress (~7.5 months total)'));
  if (c.lactating) status.push(chip('Lactating', 'life', 'Nursing a dependent infant; cycling suppressed'));
  if (c.injury > 0.02) status.push(chip(`Injured ${pct(c.injury)}%`, 'bad', 'Wound severity; slows movement, heals over days'));
  if (c.carryingMeat > 0) status.push(chip('Holding meat', 'hunt'));
  if (c.vocal) status.push(chip(`${icon('speaker')}${esc(c.vocal)}`, 'vocal'));
  if (c.nest) status.push(chip('In nest', ''));
  return status;
}

/** Overview: state meters and tags, personality, skills and the latest episodes, side by side where the panel is wide. */
function overviewHtml(ctx: Ctx, c: Chimp): string {
  const w = ctx.world();
  const needs = [
    meter('Hunger', c.hunger, 'need'), meter('Thirst', c.thirst, 'need'), meter('Energy', c.energy, 'good'), meter('Social need', 1 - c.social, 'need'),
    meter('Stress', c.stress, 'neg'), meter('Health', c.health, 'good'), ...(c.injury > 0.01 ? [meter('Injury', c.injury, 'neg')] : []),
  ];
  const episodes = [...(c.episodes ?? [])].sort((a, b) => b.time - a.time).slice(0, 5);
  return `<div class="ov">
    <section class="ov-state"><h3 class="eyebrow">State <span class="muted">0–100</span></h3><div class="chips">${statusChips(c).join('')}</div><div class="needs">${needs.join('')}</div></section>
    <section class="ov-pers"><h3 class="eyebrow">Personality</h3>${radar(c.personality)}</section>
    <section class="ov-skills"><h3 class="eyebrow">Skills</h3><div class="skills">${Object.entries(c.skills).map(([k, v]) => meter(cap(k), v, 'skill')).join('')}</div></section>
    <section class="ov-epi"><h3 class="eyebrow">Recent episodes</h3>${episodes.length ? `<ol class="diary">${episodes.map(e => `<li class="k-${e.kind}"><span class="mono">${ago(w, e.time)}</span>${esc(e.text)}</li>`).join('')}</ol>` : '<p class="subtle">Nothing notable yet.</p>'}</section>
  </div>`;
}

/** Log: the field log filtered to this animal. */
function logHtml(ctx: Ctx, c: Chimp): string {
  const w = ctx.world(), evs = chimpEvents(w, c.id);
  if (!evs.length) return empty(`Nothing in the field log names ${esc(c.name)} yet`, 'Entries appear here as they are recorded: greetings, grooming, conflicts, hunts, births and losses.', 'history');
  return `<div class="clog-wrap"><h3 class="eyebrow">Activity log <span class="muted">${evs.length}${evs.length === CHIMP_LOG_MAX ? '+' : ''} field-log ${evs.length === 1 ? 'entry' : 'entries'}, newest first</span></h3>
    <ol class="clog">${evs.map(e => { const cat = feedCat(e.kind); return `<li class="k-${cat} sev-${Math.min(3, e.severity ?? 0)}"><span class="mono cl-when">${stamp(w, e.time)}</span><span class="cl-ic">${icon(CAT_ICON[cat])}</span><span class="cl-text">${esc(e.text)}</span><span class="mono cl-ago">${ago(w, e.time)}</span></li>`; }).join('')}</ol></div>`;
}

function familyHtml(ctx: Ctx, c: Chimp): string {
  const w = ctx.world();
  const mother = w.chimps.find(x => x.id === c.motherId), sire = w.chimps.find(x => x.id === c.fatherId);
  const offspring = w.chimps.filter(x => x.motherId === c.id || x.fatherId === c.id);
  const sibs = c.motherId >= 0 ? w.chimps.filter(x => x.motherId === c.motherId && x.id !== c.id) : [];
  const natal = troopOf(w, c.natalTroopId);
  return `<div class="fam">
    <div class="fam-tree">${egoTreeSvg(w, c, 340)}</div>
    <div class="fam-facts">
      <dl class="facts-dl">
        <div><dt>Mother</dt><dd>${mother ? `<button class="lnk" data-select="${mother.id}">${esc(mother.name)}</button>${mother.alive ? '' : ' †'}` : 'Unknown (founder)'}</dd></div>
        <div><dt>Genetic sire</dt><dd>${sire ? `<button class="lnk" data-select="${sire.id}">${esc(sire.name)}</button>${sire.alive ? '' : ' †'}` : 'Unknown'}</dd></div>
        <div><dt>Maternal siblings</dt><dd>${sibs.length ? `${sibs.filter(s => s.alive).length} of ${sibs.length} living` : 'None'}</dd></div>
        <div><dt>Offspring</dt><dd>${offspring.length ? `${offspring.filter(s => s.alive).length} of ${offspring.length} living` : 'None'}</dd></div>
        <div><dt>Natal community</dt><dd>${natal ? `${troopChip(natal)}${c.natalTroopId !== c.troopId ? ' <span class="muted">immigrated</span>' : ''}` : '—'}</dd></div>
      </dl>
      <div class="legend"><span class="lg-shape"><b class="sq"></b>male <b class="ci"></b>female</span><span><i class="ln mat"></i>mother</span><span><i class="ln sire"></i>genetic sire</span><span><b class="dead-mk">†</b>deceased</span><span><b class="imm-mk">↘</b>immigrant</span></div>
      <p class="honest">Chimpanzees recognise maternal kin. The sire is genetic ground truth from the simulation; the chimps themselves do not know paternity.</p>
    </div>
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

/** Relations: the ego network, the relationship list, allies and recent interactions, and the social memory. */
function socialHtml(ctx: Ctx, c: Chimp): string {
  const w = ctx.world();
  const rows = relationshipRows(ctx, c), hasTension = rows.some(r => r.tension !== null);
  const allies = (c.allies ?? []).map(id => w.chimps.find(x => x.id === id)).filter((x): x is Chimp => !!x);
  const inter = w.interactions.filter(i => i.participants?.includes(c.id) || i.actorId === c.id || i.targetId === c.id).sort((a, b) => b.start - a.start).slice(0, 6);
  const ego = egoNetworkSvg(w, c, ctx.deps.relationOf, 340, 230);
  return `<div class="soc">
    ${ego ? `<section class="soc-net">${ego}${relationLegend()}</section>` : ''}
    <section><h3 class="eyebrow">Relationships <span class="muted">0–100${hasTension ? ` · rival at ${Math.round((rows.find(x => x.r)?.r?.rivalAt ?? RIVAL_TENSION_FALLBACK) * 100)} tension` : ''}</span></h3>${rows.length ? `<div class="bonds-head${hasTension ? ' t' : ''}" aria-hidden="true"><span>Individual</span><span></span><span>Bond</span>${hasTension ? '<span>Tension</span>' : ''}</div><ol class="bonds${hasTension ? ' t' : ''}">${rows.map(b => {
      const rel = ctx.deps.relationOf(w, c, b.o), rival = (b.tension ?? 0) >= (b.r?.rivalAt ?? RIVAL_TENSION_FALLBACK);
      return `<li><button data-select="${b.o.id}" title="${esc(relTitle(ctx, b))}"><span class="b-name"><em>${b.o.sex === 'male' ? '♂' : '♀'}</em>${esc(b.o.name)}</span><span class="rel ${relationClass(rel)}">${RELATION_LABEL[rel]}</span><span class="b-val">${bar(b.bond, `rel-${relationClass(rel)}`, 'Bond')}<b class="mono">${pct(b.bond)}</b></span>${b.tension !== null ? `<span class="b-val tension${rival ? ' rival' : ''}">${bar(b.tension, rival ? 'bad' : 'tension', 'Tension')}<b class="mono">${pct(b.tension)}</b></span>` : ''}</button></li>`;
    }).join('')}</ol>` : '<p class="subtle">No bonds above the noise floor yet. Bonds grow through grooming, play and shared travel.</p>'}</section>
    <section class="soc-ctx">
      ${allies.length ? `<h3 class="eyebrow">Coalition allies</h3><div class="ally-row">${allies.map(a => `<button class="pal" data-select="${a.id}">${icon('link')}${esc(a.name)}${a.alive ? '' : ' †'}</button>`).join('')}</div>` : ''}
      ${c.lastConflict ? `<h3 class="eyebrow">Last conflict</h3><p class="conf ${c.lastConflict.won ? 'won' : 'lost'}">${c.lastConflict.won ? 'Won against' : 'Lost to'} <button class="lnk" data-select="${c.lastConflict.opponentId}">${esc(nameOf(w, c.lastConflict.opponentId))}</button> · ${ago(w, c.lastConflict.time)}</p>` : ''}
      <h3 class="eyebrow">Recent interactions</h3>${inter.length ? `<ol class="inter">
      ${inter.map(i => { const other = i.actorId === c.id ? i.targetId : i.actorId; const cat = interactionCat(i.kind); return `<li class="k-${cat}"><span class="cl-ic">${icon(CAT_ICON[cat])}</span><span>${esc(cap(i.kind.replace('-', ' ')))}${other >= 0 && other !== c.id ? ` ${i.actorId === c.id ? '→' : '←'} <button class="lnk" data-select="${other}">${esc(nameOf(w, other))}</button>` : ''}</span><span class="mono muted">${i.end === null ? 'ongoing' : ago(w, i.start)}</span></li>`; }).join('')}
    </ol>` : '<p class="subtle">None in the recent window. The Log tab lists what the field log recorded.</p>'}
      ${c.digests !== undefined || ctx.deps.relationshipOf ? `<h3 class="eyebrow">Social memory <span class="muted">monthly, then yearly</span></h3>${memoryHtml(w, c)}` : ''}
    </section>
    <p class="honest">Bond is relationship value (grooming, support, kinship); tension is recent aggression not yet repaired, fading with a 21-day half-life. Both are simulation state, illustrative and uncalibrated.</p>
  </div>`;
}

/** "Rank 3 of 7 males", "Alpha · rank 1 of 7 males", or why there is no rank. */
function rankLine(w: World, c: Chimp): string {
  const t = troopOf(w, c.troopId);
  if (!t || !c.alive) return '';
  const list = c.sex === 'male' ? t.maleHierarchy : t.femaleHierarchy, i = list.indexOf(c.id);
  if (i < 0) return 'Unranked (immature)';
  return `${t.alphaId === c.id ? 'Alpha · rank' : 'Rank'} ${i + 1} of ${list.length} ${c.sex === 'male' ? 'males' : 'females'}`;
}

const SIZE: Record<Chimp['stage'], string> = { infant: 'inf', juvenile: 'juv', adolescent: 'adol', adult: 'ad', elder: 'ad' };

export function createChimpPanel(root: HTMLElement, ctx: Ctx) {
  // The snapshot slot is static (a canvas the scene draws into, over a chip that stands in when there is no picture);
  // the text beside it is patched in place.
  root.innerHTML = `<div class="ch-id">
    <button class="ch-shot" data-act="focus" aria-keyshortcuts="F" data-tip="Focus the camera on this chimp" data-key="F"><canvas class="ch-photo" width="176" height="176" hidden></canvas><span class="ch-chip" aria-hidden="true"><b></b></span></button>
    <div class="ch-who"></div>
  </div>
  <div class="ch-main">
    <div class="ch-bar">
      <div class="tabs ch-tabs" role="tablist" aria-label="Selected chimp">${TABS.map(t => `<button role="tab" id="tab-${t.id}" data-tab="${t.id}" aria-controls="ch-body">${t.label}</button>`).join('')}</div>
      <div class="ch-actions"><button class="icon-btn sm" data-act="prev" aria-label="Previous in community ([)" data-tip="Previous in community" data-key="[">${icon('chevronL')}</button><button class="icon-btn sm" data-act="next" aria-label="Next in community (])" data-tip="Next in community" data-key="]">${icon('chevronR')}</button><button class="icon-btn sm ch-collapse" data-act="collapse" aria-keyshortcuts="I" aria-controls="ch-body" aria-expanded="true" aria-label="Collapse the chimp panel (I)" data-tip="Collapse" data-key="I">${icon('down')}</button></div>
    </div>
    <div class="ch-body" id="ch-body" role="tabpanel" tabindex="0"></div>
  </div>`;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const who = q('.ch-who'), body = q('.ch-body'), tabs = q('.ch-tabs'), shot = q('.ch-shot'), chipEl = q('.ch-chip'), collapse = q('.ch-collapse');
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
    else if (act === 'collapse') ctx.setChimpPanel(!ctx.state.chimpOpen);
    // Collapsed, the strip itself opens the panel (its buttons, handled above, keep their own jobs).
    else if (!ctx.state.chimpOpen && el.closest('.ch-who')) ctx.setChimpPanel(true);
  });
  root.addEventListener('keydown', e => {
    const g = (e.target as HTMLElement).closest<HTMLElement>('g[data-select]');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ctx.select(Number(g.dataset.select)); }
  });
  root.addEventListener('change', e => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.act === 'control') ctx.setModelControl(el.checked);
  });
  const photo = q<HTMLCanvasElement>('.ch-photo');
  let headKey = '', bodyKey = '', tabKey = '', openKey: boolean | null = null, scrolled = 0, renderedAt = -1e9;
  // Snapshot: the scene draws the animal into the canvas when asked (render/creatures/portrait.ts). Asked on a new
  // selection and once more 1.5 s later (the camera has arrived, the pose has settled); after that only when the
  // animal's activity has changed, at most every 15 s and not above 1 h/s: a readback can cost a long frame.
  const SHOT_SETTLE = 1500, SHOT_EVERY = 15000;
  let shotId = -1, shotAction = '', shotAt = -1e9, shotDue = -1;
  function snapshot(c: Chimp | undefined) {
    const api = ctx.deps.getScene()?.portrait;
    if (!c || !c.alive || !api) { if (!photo.hidden) photo.hidden = true; shotId = -1; return; }
    const now = performance.now();
    if (c.id !== shotId) {
      if (!photo.hidden) photo.hidden = true;   // never another animal's face under this name
      shotId = c.id; shotAction = c.action; shotAt = now; shotDue = now + SHOT_SETTLE;
      api.request(c.id, photo);
      return;
    }
    const clk = ctx.deps.clock, changed = c.action !== shotAction && now - shotAt >= SHOT_EVERY && !(clk.playing && clk.effectiveRate > 3600);
    if (!(shotDue >= 0 && now >= shotDue) && !changed) return;
    if (api.request(c.id, photo, true)) { shotAction = c.action; shotAt = now; shotDue = -1; }
    else if (shotDue >= 0) shotDue = now + SHOT_SETTLE;   // refused (frames run long, or no picture now): try again shortly
  }
  body.addEventListener('scroll', () => { scrolled = body.scrollTop; }, { passive: true });
  return {
    update(force = false) {
      const w = ctx.world(), c = ctx.selected(), open = ctx.state.chimpOpen;
      if (open !== openKey) {
        openKey = open;
        setAttr(collapse, 'aria-expanded', String(open));
        setAttr(collapse, 'aria-label', `${open ? 'Collapse' : 'Expand'} the chimp panel (I)`); setAttr(collapse, 'data-tip', open ? 'Collapse' : 'Expand');
        morph(collapse, icon(open ? 'down' : 'up'));
        bodyKey = '';   // the tab renders in full when the panel opens again
      }
      snapshot(c);
      if (!c) { headKey = ''; morph(who, '<h2 class="ch-name"><span>Nobody selected</span></h2><p class="ch-meta">Click a chimp in the forest, on the map or in the field log.</p>'); if (open) renderInto(body, ''); return; }
      const t = troopOf(w, c.troopId), now = nowLine(w, c);
      const hk = [c.id, c.name, c.alive, c.stage, ageText(c), c.troopId, c.natalTroopId, t?.alphaId, t?.color, rankLine(w, c), now, c.action].join('|');
      if (force || hk !== headKey) {
        headKey = hk;
        renderInto(who, `<h2 class="ch-name"><span>${esc(c.name)}</span>${t?.alphaId === c.id && c.alive ? alphaBadge() : ''}${c.alive ? '' : '<span class="dagger" title="Deceased">†</span>'}</h2>
          <p class="ch-comm">${troopChip(t)}${c.natalTroopId !== c.troopId ? '<span class="muted">immigrant</span>' : ''}</p>
          <p class="ch-meta">${cap(c.stage)} ${c.sex} · ${ageText(c)}<span class="mono" title="Individual number">#${String(c.id).padStart(3, '0')}</span></p>
          <p class="ch-rank">${esc(rankLine(w, c))}</p>
          <p class="ch-now">${icon(ACTION_ICON[c.action] ?? 'leaf')}<span>${esc(now)}</span></p>`);
        // Stand-in for the snapshot: the unit chip (square male, circle female, community colour, monogram).
        setText(chipEl.firstElementChild!, c.name.slice(0, 2)); setAttr(chipEl, 'data-sex', c.sex); setAttr(chipEl, 'data-size', SIZE[c.stage] ?? 'ad');
        if (t) shot.style.setProperty('--c', t.color);
        setAttr(shot, 'aria-label', `Focus the camera on ${c.name} (F)`);
      }
      if (!open) return;   // collapsed: the strip above is all there is to keep fresh
      const tk = ctx.state.tab;
      if (tk !== tabKey || force) { tabKey = tk; tabs.querySelectorAll<HTMLElement>('[data-tab]').forEach(b => { const on = b.dataset.tab === tk; setAttr(b, 'aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }); setAttr(body, 'aria-labelledby', `tab-${tk}`); setAttr(body, 'data-tab', tk); }
      let bk: string, html: () => string;
      switch (tk) {
        case 'mind': bk = mindKey(ctx, c); html = () => mindHtml(ctx, c); break;
        case 'family': bk = [c.id, w.chimps.length, w.chimps.filter(x => !x.alive).length, Math.floor(w.time / 24)].join('|'); html = () => familyHtml(ctx, c); break;
        case 'social': bk = [c.id, Math.floor(w.time * 4), w.interactions.length, c.digests?.length ?? 0].join('|'); html = () => socialHtml(ctx, c); break;
        case 'log': { const evs = chimpEvents(w, c.id); bk = [c.id, evs.length, evs[0]?.time ?? '', Math.floor(w.time * 12)].join('|'); html = () => logHtml(ctx, c); break; }
        default: bk = [c.id, c.mood, c.alive, Math.round(c.hunger * 50), Math.round(c.thirst * 50), Math.round(c.energy * 50), Math.round(c.social * 50), Math.round(c.stress * 50), Math.round(c.health * 50), Math.round(c.injury * 50), Math.round(c.swelling * 20), c.lactating, c.pregnancy > 0, c.carryingMeat > 0, c.vocal, c.nest !== null, c.episodes?.length, Math.floor(w.time * 4)].join('|'); html = () => overviewHtml(ctx, c);
      }
      bk = `${tk}:${bk}`;
      if (force || bk !== bodyKey) {
        const sameChimpTab = bodyKey.split(':')[0] === tk && bodyKey.split('|')[0] === bk.split('|')[0];
        // Dense tabs (trees, networks, decision history, the log) redraw at most once a second when only
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
