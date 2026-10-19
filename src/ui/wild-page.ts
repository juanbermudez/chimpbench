// The page "How close to the wild" (stage V1, docs/staging/v1-field.md): every yardstick of data/targets.json that is
// not sealed, its field band and sources beside the reference runs of the model, and this world's exact life record.
// Loaded only when first opened (key K, or the menu bar's "born · died"), with its stylesheet; the two bundles under
// public/field/ are fetched then, once. A scrim and a glass sheet over the live forest, as Society's full view.
//
// It reads the World and writes nothing to it: no tick hook, no selection unless "Select" is pressed. While open it
// refreshes at most once a second, and only the parts whose words changed (a birth, a death, a new day) are morphed.

import type { Ctx } from './app';
import type { LiteTarget, RefArm, ReferenceFile, TargetsLite } from '../yardstick/bundle';
import { SECTIONS } from '../yardstick/sections';
import { SAME_DEFINITION } from '../yardstick/same';
import { armMatches, isPattern, neverCounted, refState, refusal, stressClones, worldState, type Mark } from '../yardstick/view';
import { axisOf, dateWords, daysWords, fmtValue, sig2, wallWords } from '../yardstick/words';
import { poissonInterval } from '../yardstick/field';
import { CAUSE_CLASSES, CAUSE_WORDS, causeClass, causeWords, censusSeries, dayOf, deathsByClass, firstYearMortality, isKilling, lifeRecord, type CauseClass, type LifeRecord } from '../yardstick/life';
import { modelIdentityOf } from '../simulation';
import { modelEngine } from './mind-card';
import { ageBarsSvg, deathsBarSvg, infantLanesSvg, lifeTableSvg, populationSvg } from './life-charts';
import { detailHtml, roleWords, rowHtml, type RowView } from './yardstick';
import { esc, troopShort } from './format';
import { icon } from './icons';
import { morph, setAttr } from './morph';
import type { World } from '../types';
import './wild.css';

const ONE_WORLD = 'One simulated world. Its values describe this run, not wild chimpanzees. The reference runs are several worlds over years, and they are one model too.';
const GUIDE_KEY = 'mgogo.wild.guide';
const readPref = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const writePref = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* not kept */ } };

export interface WildUi { lane: 'ref' | 'world' | null; arm: string | null }

export function createWildPage(root: HTMLElement, ctx: Ctx, ui: WildUi) {
  root.innerHTML = `<div class="wild-scrim" data-wact="close"></div>
  <div class="wild-panel" role="dialog" aria-modal="true" aria-labelledby="wild-title">
    <header class="wild-head">
      <div class="wild-titles"><h2 id="wild-title">How close to the wild</h2><p class="wild-one">${esc(ONE_WORLD)}</p></div>
      <button class="wild-link" data-wact="guide">How to read this</button>
      <button class="icon-btn" data-wact="close" aria-label="Close (Esc)">${icon('close')}</button>
    </header>
    <p class="wild-prov" data-part="prov"></p>
    <div class="wild-body">
      <nav class="wild-index" aria-label="Sections"></nav>
      <div class="wild-main" tabindex="-1"><p class="w-empty">Loading the yardsticks…</p></div>
    </div>
  </div>`;
  const panel = root.querySelector<HTMLElement>('.wild-panel')!, main = root.querySelector<HTMLElement>('.wild-main')!, nav = root.querySelector<HTMLElement>('.wild-index')!;
  let lite: TargetsLite | null = null, ref: ReferenceFile | null = null, loading: Promise<void> | null = null, failed = '';
  let open = false, built = false, renderedAt = -1e9, liveKey = '', guide = readPref(GUIDE_KEY) !== '1';
  const openRows = new Set<string>();
  const parts = new Map<string, string>();
  let lastFocus: HTMLElement | null = null;

  function load(): Promise<void> {
    if (loading) return loading;
    const base = import.meta.env.BASE_URL;
    loading = Promise.all([fetch(`${base}field/targets-lite.json`), fetch(`${base}field/reference.json`)])
      .then(async ([a, b]) => { if (!a.ok || !b.ok) throw new Error(`the yardstick files did not load (${a.status}, ${b.status})`); lite = await a.json() as TargetsLite; ref = await b.json() as ReferenceFile; })
      .catch(e => { failed = e instanceof Error ? e.message : String(e); });
    return loading;
  }

  // ---- what the page shows about this world
  interface Now { w: World; id: ReturnType<typeof modelIdentityOf>; refused: ReturnType<typeof refusal>; life: LifeRecord; arm: RefArm; matching: Set<string>; communities: string }
  let lifeFor = '', lifeCache: LifeRecord | null = null;
  function now(): Now {
    const w = ctx.world(), id = modelIdentityOf(w), refused = refusal(w, stressClones(w));
    const k = `${w.seed}|${w.chimps.length}|${w.stats.deaths}|${w.stats.births}|${dayOf(w.time)}|${w.troops.length}|${w.time < 24 ? Math.floor(w.time) : ''}`;
    if (k !== lifeFor || !lifeCache) { lifeFor = k; lifeCache = lifeRecord(w); }
    const matching = new Set(ref!.arms.filter(a => armMatches(a, id)).map(a => a.id));
    const arm = ref!.arms.find(a => a.id === ui.arm) ?? ref!.arms.find(a => matching.has(a.id)) ?? ref!.arms[0];
    const communities = 'This world now: ' + w.troops.map(t => { const m = w.chimps.filter(c => c.alive && c.troopId === t.id); return `${troopShort(t)} ${m.length} members (${m.filter(c => c.sex === 'male' && c.age >= 15).length} adult males)`; }).join(', ') + '.';
    return { w, id, refused, life: lifeCache, arm, matching, communities };
  }
  const placed = (n: Now) => lite!.targets.filter(t => SAME_DEFINITION[t.id] && worldState(t, n.w, n.life, n.id.popCap, n.refused).kind === 'marks').length;
  // One lane: the reference runs until this world has values on at least three rows (design assumption: one or two
  // squares alone would leave the overview nearly empty), or whichever lane the user chose.
  const lane = (n: Now): 'ref' | 'world' => ui.lane ?? (placed(n) >= 3 ? 'world' : 'ref');

  function scaledWords(t: LiteTarget, n: Now): string {
    if (!t.scaled) return '';
    const far: string[] = [];
    for (const tr of n.w.troops) {
      const m = n.w.chimps.filter(c => c.alive && c.troopId === tr.id), am = m.filter(c => c.sex === 'male' && c.age >= 15).length;
      if (t.scaled.members && Math.abs(m.length - t.scaled.members) > 0.5 * t.scaled.members) far.push(`${troopShort(tr)} (${m.length} members)`);
      if (t.scaled.adultMales && (am < t.scaled.adultMales[0] || am > t.scaled.adultMales[1])) far.push(`${troopShort(tr)} (${am} adult males)`);
    }
    return `${n.communities}${far.length ? ` Far from the size the band is written for: ${far.join(', ')}.` : ''}`;
  }
  function view(t: LiteTarget, n: Now): RowView {
    const r = refState(t, n.arm), wsx = worldState(t, n.w, n.life, n.id.popCap, n.refused);
    const v: RowView = { t, arm: n.arm, ref: r, world: wsx, communities: scaledWords(t, n), open: openRows.has(t.id), detail: '',
      matchNote: n.arm.id === 'Y3-T0' && n.matching.has(n.arm.id) ? ref!.todayMatch : '' };
    if (v.open) v.detail = detailHtml(v, lite!.sources, ref!.arms, n.matching);
    return v;
  }

  // ---- header lines
  function provenance(n: Now): string {
    const { w, id, life, arm } = n;
    const model = Object.keys(id.overrides).length ? `a model with ${Object.keys(id.overrides).length} settings changed from today’s defaults` : 'today’s model';
    const map = id.profile === 'field' ? 'Field map' : 'The 160 m map';
    const deciders = w.chimps.filter(c => c.alive && c.controller === 'model').length;
    const who = w.modelPolicy.mode === 'off' || !deciders ? 'The rules decide for every animal now.'
      : `Now ${esc(modelEngine(ctx.deps.decider.model, ctx.deps.decider.provider).label.toLowerCase())} decides for ${deciders} animal${deciders === 1 ? '' : 's'}; animals under 8 are always on the rules.`;
    const days = Math.max(1, dayOf(w.time));
    const exp = w.stimuli.length ? ` An experiment is under way (${esc(w.stimuli.map(s => s.label).join(', '))}).` : '';
    return `${map}, seed ${w.seed}, ${model} (patrols from ${id.patrols === 'hazard' ? 'a tuned hazard' : 'the males’ own decision'}). ${who} Earlier hours are not recorded in this build.${exp}
      Exact record (all-seeing): days 1 to ${days}${days <= 30 ? ', inside the settling-in month the reference runs skipped' : ', including the settling-in month the reference runs skipped'}. Field teams: not running in this build.
      Reference: ${esc(arm.name.toLowerCase())}, ${arm.seeds.length} worlds × ${sig2(arm.days / 365)} years after a ${arm.burnInDays}-day settling-in, field map, rules only, run ${esc(dateWords(arm.runDate))}${arm.protocol.current ? '' : ' under an older protocol'}${n.matching.has(arm.id) ? '' : ' (another model, for context only)'}.${arm.id === 'Y3-T0' && n.matching.has(arm.id) ? ` <span class="w-match">${esc(ref!.todayMatch.split(':')[0])}, not re-verified by a run.</span>` : ''}`;
  }

  function guideHtml(): string {
    if (!guide) return '';
    return `<section class="w-guide" aria-label="How to read this page">
      <h3>How to read this page</h3>
      <ul>
        <li><i class="g-band"></i><span>The <b>blue bar</b> is the <b>field band</b>: the range of values field studies of wild chimpanzees report for that measure. Its studies are listed under each row.</span></li>
        <li><i class="g-ring"></i><span>A <b>ring</b> is the <b>reference runs</b>: five worlds of one model watched for three years by virtual field teams (rows read from the simulation itself say so); the menu says which model, and whether it is this world’s. A <b>square</b> is <b>this world’s exact record</b>, drawn only where it counts what the field counts; a hollow square has no interval. “Too close to call” means an interval reaches across an edge of the band.</span></li>
        <li><i class="g-scale"></i><span>Distances are in <b>band widths</b>: “1 band width above” is as far above the band as the band is wide. A wide band makes “inside” easy, so wide bands are marked.</span></li>
        <li><i class="g-none"></i><span>Nothing here is a score. The middle column of “At a glance” is where the field is, not a target. Field numbers are yardsticks, not settings: nothing on this page changes the simulation.</span></li>
      </ul>
      <button class="btn" data-wact="guide-ok">Got it</button>
    </section>`;
  }

  // ---- At a glance: every row placed by its distance from its band, one lane (the reference runs until this world has values)
  function glanceHtml(n: Now): string {
    // On a phone the overview is drawn narrow, with its counts left to each chapter (no horizontal scroll, no tiny text).
    const compact = main.clientWidth > 0 && main.clientWidth < 600;
    const ln = lane(n), Wd = compact ? 380 : 780, L = compact ? 96 : 150, G = compact ? 0 : 168, rowH = 30, top = 34;
    const xc = L + (Wd - L - G) / 2, unit = (Wd - L - G) / 9.6;
    const X = (p: number) => xc + p * unit;
    const secs = SECTIONS;
    const H = top + secs.length * rowH + 8;
    let s = `<rect class="gl-in" x="${X(-0.5)}" y="${top - 6}" width="${unit}" height="${H - top}"/>`;
    for (const [p, lab] of [[1.5, '1'], [2.5, '2'], [3.5, '4'], [4.5, '8']] as const) for (const sgn of [-1, 1]) s += `<line class="gl-hair" x1="${X(sgn * p)}" x2="${X(sgn * p)}" y1="${top - 6}" y2="${H - 2}"/><text class="gl-lab" x="${X(sgn * p)}" y="${top - 10}" text-anchor="middle">${lab}</text>`;
    s += compact ? `<text class="gl-side" x="${X(-4.5)}" y="12" text-anchor="start">lower</text><text class="gl-side" x="${X(4.5)}" y="12" text-anchor="end">higher</text><text class="gl-mid" x="${xc}" y="12" text-anchor="middle">inside the band</text>`
      : `<text class="gl-side" x="${X(-4.5)}" y="12" text-anchor="start">lower than the wild</text><text class="gl-side" x="${X(4.5)}" y="12" text-anchor="end">higher than the wild</text><text class="gl-mid" x="${xc}" y="12" text-anchor="middle">inside the field band</text><text class="gl-lab" x="${X(4.5) + 10}" y="${top - 10}" text-anchor="start">band widths</text>`;
    const lines: string[] = [];
    secs.forEach((sec, i) => {
      const y0 = top + i * rowH;
      s += `<text class="gl-sec" x="0" y="${y0 + 14}">${esc(sec.title)}</text><line class="gl-sep" x1="${L}" x2="${Wd - G + 4}" y1="${y0 + rowH - 4}" y2="${y0 + rowH - 4}"/>`;
      const counts: string[] = [];
      (['held-out', 'fitted'] as const).forEach((role, k) => {
        const y = y0 + 6 + k * 11;
        const rows = lite!.targets.filter(t => t.section === sec.id && t.role === role);
        let withV = 0, never = 0, waiting = 0, pattern = 0;
        for (const t of rows) {
          if (neverCounted(t)) { never++; continue; }
          if (isPattern(t)) { pattern++; continue; }
          let marks: Mark[] = [], caveat = '';
          if (ln === 'ref') { const r = refState(t, n.arm); if (r.kind === 'marks') { marks = r.marks; if (r.row.flags.includes('instrument below bar')) caveat += ' · shown, not scored: the detector is below its bar'; } }
          else { const ws = worldState(t, n.w, n.life, n.id.popCap, n.refused); if (ws.kind === 'marks') marks = ws.marks; }
          if (!marks.length) { waiting++; continue; }
          withV++;
          // the labels that change what a place on the axis means travel with it (review, 19 October)
          if (t.flags.some(f => f.key === 'heldAsFail')) caveat += ' · held as a fail whatever its value';
          if (t.flags.some(f => f.key === 'tuned')) caveat += ' · tuned against this band';
          for (const m of marks) {
            const a = axisOf(m.value, m.band); if (!a) continue;
            const tip = `${t.metric}${m.part ? ` (${m.part})` : ''}, ${roleWords(t)}: ${fmtValue(m.value, m.interval)} ${t.accept.units} · ${m.dist?.words ?? ''}${caveat}`;
            const x = X(a.pos);
            s += `<g class="gl-m" data-glance="${esc(t.id)}" data-tip="${esc(tip)}" tabindex="-1">${ln === 'ref' ? `<circle class="gl-ring" cx="${x.toFixed(1)}" cy="${y}" r="3.6"/>` : `<rect class="gl-sq" x="${(x - 3).toFixed(1)}" y="${y - 3}" width="6" height="6"/>`}${a.clamped ? `<path class="gl-arrow" d="M${(x + (a.pos > 0 ? 6 : -6)).toFixed(1)} ${y} l${a.pos > 0 ? -4 : 4} -3 v6 Z"/>` : ''}</g>`;
          }
        }
        const numeric = rows.length - pattern - never;
        counts.push(`${role === 'held-out' ? 'held out' : 'fitted'}: ${withV} of ${numeric} placed${never ? `, ${never} never counted` : ''}${pattern ? `, ${pattern} pattern${pattern === 1 ? '' : 's'}` : ''}`);
        const bits = [...(numeric ? [`<tspan class="gl-n">${withV} of ${numeric}</tspan>`] : []), ...(never ? [`${never} ✕`] : []), ...(pattern ? [`${pattern} pattern${pattern === 1 ? '' : 's'}`] : [])];
        if (!compact) s += `<text class="gl-count" x="${Wd - G + 12}" y="${y + 3.5}">${bits.join(' · ')}</text>`;
        if (i === 0 && !compact) s += `<text class="gl-role" x="${L - 6}" y="${y + 3}" text-anchor="end">${role === 'held-out' ? 'held out' : 'fitted'}</text>`;
        void waiting;
      });
      lines.push(`${sec.title}: ${counts.join('; ')}`);
    });
    const alt = `Each yardstick placed by its distance from its field band, ${ln === 'ref' ? `reference runs of ${n.arm.name}` : 'this world’s exact record'}. ${lines.join('. ')}.`;
    const nWorld = placed(n);
    const seg = `<div class="seg" role="group" aria-label="Which values"><button data-wlane="ref" aria-pressed="${ln === 'ref'}">Reference runs</button><button data-wlane="world" aria-pressed="${ln === 'world'}">This world${nWorld ? '' : ' (nothing yet)'}</button></div>`;
    const armSel = `<label class="w-arm"><span>Reference</span><select data-warm>${ref!.arms.map(a => `<option value="${esc(a.id)}"${a.id === n.arm.id ? ' selected' : ''}>${esc(a.name)}${n.matching.has(a.id) ? '' : ' (another model)'}</option>`).join('')}</select></label>`;
    const empty = ln === 'world' && !nWorld ? `<p class="w-note">Nothing of this world can be placed yet. Only five rows can be read from its exact record in this build (first-year mortality, causes of death, respiratory deaths, births at 20 to 30, killings), and each needs a year of watching; this world has ${esc(String(Math.max(0, Math.floor(n.life.days))))} days (${esc(wallWords(365 - n.life.days))}).</p>` : '';
    return `<div class="w-glance-head">${seg}${armSel}</div>
      <p class="w-sub">${ln === 'ref' ? `Rings: the reference runs of ${esc(n.arm.name.toLowerCase())}${n.matching.has(n.arm.id) ? '' : ' (another model, for context only)'}${n.arm.protocol.current ? '' : ', scored under an older protocol'}.` : 'Squares: this world’s exact record, only on rows where it counts what the field counts.'} In each section the upper line is held out (never used to set anything), the lower line fitted (settings were chosen with these values in view).${compact ? '' : ' At the right: how many of the rows with a number have a value placed; rows reported but never counted (✕) and rows with a pattern instead of a number are counted there, not drawn.'}</p>
      ${empty}
      <svg class="gl" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(alt)}">${s}</svg>`;
  }

  // ---- chapters
  const foldCauses = (byCause: Record<string, number>) => {
    const out: Partial<Record<CauseClass, number>> = {};
    for (const [c, k] of Object.entries(byCause)) { const cl = causeClass(c); out[cl] = (out[cl] ?? 0) + k; }
    return CAUSE_CLASSES.filter(cl => out[cl]).map(cl => `${out[cl]} ${CAUSE_WORDS[cl]}`).join(', ');
  };
  function viabilityHtml(arm: RefArm, n: Now): string {
    const v = arm.viability;
    const head = v.pass ? `The reference runs of ${esc(arm.name.toLowerCase())} passed their viability check (births at least deaths, no starvation, no world below 80% of its start).`
      : `The reference runs of ${esc(arm.name.toLowerCase())} failed their viability check: ${esc(v.reasons.join('; ').replace(/\ba seed\b/g, 'a world').replace(/\bseeds\b/g, 'worlds'))}.`;
    const worlds = v.worlds.map(x => `<li>World ${x.seed}: ${x.livingStart} → ${x.livingEnd} animals, ${x.births} births, ${x.deaths} deaths${x.deaths ? ` (${esc(foldCauses(x.deathsByCause))})` : ''}</li>`).join('');
    return `<div class="w-ref"><p>${head} Over ${arm.seeds.length} worlds × ${sig2(arm.days / 365)} years: ${v.births} births, ${v.deaths} deaths.${n.matching.has(arm.id) ? '' : ' Another model, for context only.'}</p><ul class="w-worlds">${worlds}</ul></div>`;
  }
  const dayWord = (t: number) => `day ${dayOf(t)}`;
  const ageWord = (a: number) => (a < 1 ? `${Math.max(1, Math.round(a * 12))} months` : `${a < 10 ? a.toFixed(1) : Math.floor(a)} years`);

  function worldBlock(sec: string, n: Now): string {
    const { w, life, id } = n;
    const head = (extra = '') => `<p class="w-eyebrow">This world · exact record (all-seeing), days 1 to ${Math.max(1, dayOf(w.time))}${extra}</p>`;
    if (n.refused.all) return `<div class="w-world"><p class="w-note">${esc(n.refused.all)}</p></div>`;
    // At life-course speed the animals age faster than the clock their birth and death times are on: ages are then their
    // own (chimp.age), mothers' ages at a birth are not known, and the life table is not drawn (review, 19 October).
    const course = !!n.refused.demography;
    const demoNote = course ? `<p class="w-note">${esc(n.refused.demography)} The charts below stay, as exploration. Ages are each animal’s own; the life table and mothers’ ages are left out, because at this speed ages run faster than the clock the record keeps.</p>` : '';
    const ownAges = <T extends { age: number; ownAge: number }>(rows: T[]) => (course ? rows.map(r => ({ ...r, age: r.ownAge })) : rows);
    switch (sec) {
      case 'patrols': {
        const out = w.parties.filter(p => p.kind === 'patrol');
        const caught = n.arm.patrolCatch, d = caught.reduce((a, c) => a + c.detected, 0), tt = caught.reduce((a, c) => a + c.truth, 0);
        const phase: Record<string, string> = { out: 'heading out', listen: 'at a listening stop', incursion: 'inside a neighbour’s range', return: 'heading home' };
        const live = out.length ? out.map(p => { const t = w.troops.find(x => x.id === p.troopId); return `${esc(troopShort(t))} community: ${p.members.length} on patrol, ${esc(phase[p.patrolPhase ?? 'out'] ?? 'out')}`; }).join('; ') : 'No patrol is out right now.';
        return `<div class="w-world">${head()}<p>${out.length ? `Out now: ${live}.` : live} In this world patrols come from ${id.patrols === 'hazard' ? 'a tuned hazard: a set chance per hour that the males set out, chosen against the patrol-rate band' : 'the males’ own decision'}.</p>
          <p class="w-note">The field teams catch few patrols: in the reference runs of ${esc(n.arm.name.toLowerCase())} they classified ${d} of the ${tt} patrols that happened (${Math.round(d / Math.max(1, tt) * 100)}%; ${caught.map(c => `${c.detected} of ${c.truth}`).join(', ')} by world). ${n.arm.instrument.patrol ? ` Of the patrols that passed while a team was following, the detector found ${Math.round(n.arm.instrument.patrol.recall * 100)}% (${n.arm.instrument.patrol.classified} found, ${Math.round(n.arm.instrument.patrol.precision * 100)}% of them real).` : ''} Every patrol row is shown, not scored, until the detector finds at least 80% of real patrols with at least 80% of its finds real.</p></div>`;
      }
      case 'encounters': {
        const k = life.deaths.filter(x => isKilling(x.cause));
        const cy = w.troops.length * life.days / 365;
        const kill = k.length ? `${k.length} killing${k.length === 1 ? '' : 's'} (${k.map(x => `${esc(x.name)}, ${dayWord(x.t)}`).join('; ')})` : `no killing in ${sig2(cy)} community-years${cy >= 1 ? `: below ${sig2(poissonInterval(0)[1] / cy)} a year (95%, the scorer’s interval)` : ''}`;
        return `<div class="w-world">${head()}<p>${w.stats.intergroupEncounters} meetings between communities happened (heard or seen, every pair together) and ${kill}. The field band counts what a followed party detected, so the count of meetings is not placed on it.</p>
          <p class="w-note">${id.profile === 'compressed' ? 'On the 160 m map animals hear strangers 36 m away: encounter rows are not comparable here. ' : ''}A pair of communities whose ranges drift within earshot (1 km) records a heard meeting almost daily, so a single world can run far above the band (docs/simulation.md §18).</p></div>`;
      }
      case 'births': {
        const cen = censusSeries(w);
        const pop = populationSvg(cen, life.births.map(b => ({ day: dayOf(b.t) })), life.deaths.map(x => ({ day: dayOf(x.t), klass: x.klass })), id.popCap);
        const list = life.births.slice(0, 8).map(b => `<li><span class="mono">${dayWord(b.t)}</span> ${esc(b.name)}, ${b.sex} · mother ${esc(b.motherName || 'unknown')}${b.motherAge !== null && !course ? `, ${esc(ageWord(b.motherAge))}` : ''} · ${esc(troopShort(w.troops.find(t => t.id === b.troopId)))}${b.alive ? '' : ' · died since'}</li>`).join('');
        const viab = n.arm.viability;
        return `<div class="w-world">${head()}${demoNote}<h4>Population</h4>${pop}<p class="w-sub">Living animals each evening (21:00), rebuilt from birth and death times; births tick above the axis, deaths below it. Population size and age structure are not field targets. The founders’ ages are as the world generator set them (a design choice).</p>
          <h4>Births</h4>${life.births.length ? `<ul class="w-list">${list}</ul>${life.births.length > 8 ? `<p class="w-sub">and ${life.births.length - 8} earlier.</p>` : ''}` : '<p class="w-empty">No birth yet.</p>'}
          <p class="w-sub">Reference runs of ${esc(n.arm.name.toLowerCase())}: ${viab.births} births in ${n.arm.seeds.length} worlds × ${sig2(n.arm.days / 365)} years (${viab.worlds.map(x => x.births).join(', ')} by world). Their populations went ${viab.worlds.map(x => `${x.livingStart} → ${x.livingEnd}`).join(', ')}; ${viab.pass ? 'they passed their viability check' : `they failed their viability check (${esc(viab.reasons.join('; ').replace(/\ba seed\b/g, 'a world'))}): see Deaths`}.</p></div>`;
      }
      case 'deaths': {
        const counts = deathsByClass(life), dead = ownAges(life.deaths);
        const rec = dead.slice(0, 12).map(x => `<li data-dead="${x.id}"><span class="mono">${dayWord(x.t)}</span> <b>${esc(x.name)}</b>, ${x.sex}, ${esc(ageWord(x.age))} · ${esc(troopShort(w.troops.find(t => t.id === x.troopId)))} · <span class="k-${x.klass} w-cause">${esc(causeWords(x.cause))}</span>
          <span class="w-acts"><button data-wfamily="${x.id}">Family</button><button data-wwhere="${x.id}">Where</button><button data-wselect="${x.id}">Select</button></span><div class="w-family" data-family-of="${x.id}"></div></li>`).join('');
        const removed = life.removed.length ? `<p class="w-sub">Removed by an experiment (kept out of every rate): ${life.removed.map(x => `${esc(x.name)}, ${dayWord(x.t)}`).join('; ')}.</p>` : '';
        return `<div class="w-world">${head()}${demoNote}${deathsBarSvg(counts)}${ageBarsSvg(dead)}
          ${life.deaths.length ? `<h4>The death record</h4><ul class="w-list w-deaths">${rec}</ul>${life.deaths.length > 12 ? `<p class="w-sub">and ${life.deaths.length - 12} earlier.</p>` : ''}` : ''}${removed}
          <p class="w-note">The simulation knows every cause; the field knew the cause of 86 of 130 deaths at Gombe (williams2008). One cause, an infant’s death after losing its mother, is counted under “other causes” on this page: sealed tests protect survival after a mother’s loss. Each animal’s own record still names it.${id.bodiesMove ? ' Bodies stay in this world: “Where” shows where a body ended up, not where the animal died.' : ''}</p></div>
          ${viabilityHtml(n.arm, n)}`;
      }
      case 'mortality': {
        const ay = life.exposure.male.concat(life.exposure.female).reduce((a, b) => a + b, 0);
        return `<div class="w-world">${head()}${demoNote}${course ? '' : lifeTableSvg(life.exposure, life.deathsByBin)}${life.deaths.length && !course ? `<p class="w-sub">Deaths per animal-year in the scorer’s age bins, females filled and males hollow, over ${sig2(ay)} animal-years. Bins with no death are left blank.</p>` : ''}
          <p class="w-note">Life expectancy at 15 and survival to 45 need decades of natural aging: 20 years is ${esc(wallWords(20 * 365))}. The reference runs’ values for them are pooled from 5 worlds × 3 years: not a life expectancy.</p></div>`;
      }
      case 'infants': {
        const q = firstYearMortality(life);
        // the rate waits for the row's own minimum window, here as on the row (review, 19 October: the attack's
        // "needs a year: 38 days so far" instead of a number); the counts and the exposure are shown from day 1
        const need = lite!.targets.find(t => t.id === 'T-DEM-1')?.window.days ?? 365;
        const words = q.value === null ? `${q.basis} so far: ${q.short}`
          : life.days < need ? `${q.basis} so far; the first-year mortality is given after a year of watching (${daysWords(life.days)} so far)`
          : `${q.basis}: first-year mortality ${fmtValue(q.value, q.interval)} (95% ${fmtValue(q.interval![0], q.interval)}–${fmtValue(q.interval![1], q.interval)})`;
        return `<div class="w-world">${head()}${demoNote}${infantLanesSvg(ownAges(life.infants))}<p class="w-sub">${esc(words)}.${life.infants.length ? ' Each lane is one infant, from birth: a diamond where it died, coloured by cause; a dot where it is now, dotted to its first birthday while it is still at risk.' : ''}</p>
          <p class="w-note">Nursing, suckling and weaning rows are read from the simulation directly in the reference runs; their live readers would need a hook in the simulation’s tick, so this build shows their reference values only.</p></div>`;
      }
      case 'nutrition':
        return `<div class="w-world">${head()}<p>${id.energyLedger ? 'This world runs the energy ledger. Its live readers need a hook in the simulation’s tick, so this build shows the reference runs’ energy rows only.' : 'Today’s model has no energy budget: hunger and energy are abstract meters, and the bellies and coats drawn in the forest are stylizations, not measurements.'}</p>
          <p class="w-note">The forest’s fruit follows the Ngogo phenology record (an input), so the phenology row is not a test. Rows read from the simulation directly show reference values only.</p></div>`;
      case 'movement': {
        // km² on the field map; square metres on the 160 m map, whose areas are not comparable with the field's anyway
        const field = id.profile === 'field', unit = field ? 'km²' : 'm²';
        const rng = w.troops.map(t => { const r = t.range; if (!r) return `${troopShort(t)}: no range yet`; const a = (k: number) => k * r.cell * r.cell / (field ? 1e6 : 1); const f = (v: number) => (field ? sig2(v) : Math.round(v).toLocaleString('en-GB')); return `${troopShort(t)} ${f(a(r.cells.length))} ${unit} (core ${f(a(r.core.length))} ${unit})`; }).join(', ');
        return `<div class="w-world">${head()}<p>The simulation’s own ranges: ${esc(rng)}. ${esc(n.communities)}</p>
          <p class="w-note">These ranges are the use of the last half year or so (decayed over about 180 days), not the field’s annual kernel from followed animals, so they are never placed on the range band. Turn on “Records” on the map card to see their true outlines.${id.profile === 'compressed' ? ' The 160 m map compresses space about 50 times: lengths and areas are not comparable here, and the reference runs are field-map runs.' : ''}</p></div>`;
      }
      default: return '';
    }
  }

  function rowsHtml(sec: string, n: Now): string {
    const home = lite!.targets.filter(t => t.section === sec), also = lite!.targets.filter(t => t.also.includes(sec));
    const group = (role: 'held-out' | 'fitted', title: string, sub: string) => {
      const rows = home.filter(t => t.role === role);
      return rows.length ? `<h4 class="w-group">${title} <span>${sub}</span></h4>${rows.map(t => rowHtml(view(t, n))).join('')}` : '';
    };
    const fromSec = (t: LiteTarget) => SECTIONS.find(s => s.id === t.section)?.title ?? '';
    return group('held-out', 'Held out', 'never used to set anything') + group('fitted', 'Fitted', 'settings were chosen with published values like this in view, so agreement is expected, not a test')
      + (also.length ? `<h4 class="w-group">Also here <span>listed in full under another section</span></h4>${also.map(t => rowHtml(view(t, n)).replace('<span class="ys-chips">', `<span class="ys-chips"><span class="ys-chip">from ${esc(fromSec(t))}</span>`)).join('')}` : '');
  }

  function skeleton(): string {
    const chap = SECTIONS.map(s => `<section class="w-chap" id="w-${s.id}" data-sec="${s.id}"><h3 class="w-title">${esc(s.title)}</h3><p class="w-blurb">${esc(s.blurb)}</p>${s.chapter ? `<div data-part="world-${s.id}"></div>` : ''}<div data-part="rows-${s.id}"></div></section>`).join('');
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="wf-r" x1="0" x2="1"><stop offset="0" stop-color="#18181b" stop-opacity="0"/><stop offset="1" stop-color="#18181b"/></linearGradient><linearGradient id="wf-l" x1="1" x2="0"><stop offset="0" stop-color="#18181b" stop-opacity="0"/><stop offset="1" stop-color="#18181b"/></linearGradient></defs></svg>
      <div data-part="guide"></div><section class="w-chap" id="w-glance" data-sec="glance"><h3 class="w-title">At a glance</h3><div data-part="glance"></div></section>
      ${chap.replace('<section class="w-chap" id="w-activity"', '<p class="w-rest">The rest of the behaviour: rows only in this build.</p><section class="w-chap" id="w-activity"')}
      <p class="w-foot">${esc(ONE_WORLD)} Field numbers are yardsticks, not settings. Bands and studies: data/targets.json (protocol ${esc(lite!.freeze.hash)}, ${esc(lite!.freeze.date)}). ${lite!.sealed} rows are sealed until the long demography proof and not shown here.</p>`;
  }
  function navHtml(): string {
    const b = (id: string, title: string) => `<button data-wgo="${id}">${esc(title)}</button>`;
    return b('glance', 'At a glance') + SECTIONS.filter(s => s.chapter).map(s => b(s.id, s.title)).join('') + '<span class="w-navsep">The rest</span>' + SECTIONS.filter(s => !s.chapter).map(s => b(s.id, s.title)).join('');
  }

  function setPart(key: string, html: string) {
    if (parts.get(key) === html) return;
    parts.set(key, html);
    const el = key === 'prov' ? root.querySelector<HTMLElement>('[data-part="prov"]') : main.querySelector<HTMLElement>(`[data-part="${key}"]`);
    if (el) morph(el, html);
  }
  // A first open fills the chapters one per animation frame, so no single task builds the whole page (the header, the
  // guide and the overview come first). A section asked for (the menu bar's "born · died" opens Births) is filled at
  // once together with everything above it, so the scroll lands where it should.
  let pending: string[] | null = null;
  const section = (id: string, n: Now) => { if (SECTIONS.find(s => s.id === id)?.chapter) setPart(`world-${id}`, worldBlock(id, n)); setPart(`rows-${id}`, rowsHtml(id, n)); };
  function drain() {
    if (!pending || !open) return;
    const id = pending.shift();
    if (id && lite && ref) section(id, now());
    if (pending.length) requestAnimationFrame(drain); else pending = null;
  }
  /** Re-renders every part whose words changed. */
  function render(upTo?: string) {
    if (!lite || !ref) { morph(main, failed ? `<p class="w-empty">${esc(failed)}.</p>` : '<p class="w-empty">Loading the yardsticks…</p>'); return; }
    if (!built) { built = true; parts.clear(); main.innerHTML = skeleton(); nav.innerHTML = navHtml(); pending = SECTIONS.map(s => s.id); requestAnimationFrame(drain); }
    const n = now();
    setPart('prov', provenance(n));
    setPart('guide', guideHtml());
    setPart('glance', glanceHtml(n));
    if (upTo && pending) { const k = pending.indexOf(upTo); if (k >= 0) for (const id of pending.splice(0, k + 1)) section(id, n); }
    for (const s of SECTIONS) if (!pending?.includes(s.id)) section(s.id, n);
    renderedAt = performance.now();
  }

  function go(id: string) {
    const el = main.querySelector<HTMLElement>(`#w-${id}`);
    if (el) main.scrollTop += el.getBoundingClientRect().top - main.getBoundingClientRect().top - 4;
  }
  function openRow(id: string) {
    openRows.add(id);
    const t = lite?.targets.find(x => x.id === id);
    render(t?.section);
    const d = main.querySelector<HTMLDetailsElement>(`details[data-row="${CSS.escape(id)}"]`);
    if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); d.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true }); }
  }

  // ---- events (delegated; nothing here writes to the World except an explicit Select)
  root.addEventListener('click', e => {
    const el = e.target as HTMLElement;
    const act = el.closest<HTMLElement>('[data-wact]')?.dataset.wact;
    if (act === 'close') { close(); return; }
    if (el.closest('.wild-prov')) { el.closest('.wild-prov')!.classList.toggle('open'); return; }
    if (act === 'guide') { guide = !guide; render(); if (guide) main.scrollTop = 0; return; }
    if (act === 'guide-ok') { guide = false; writePref(GUIDE_KEY, '1'); render(); return; }
    const g = el.closest<HTMLElement>('[data-wgo]'); if (g) { if (pending?.includes(g.dataset.wgo!)) render(g.dataset.wgo); go(g.dataset.wgo!); return; }
    const l = el.closest<HTMLElement>('[data-wlane]'); if (l) { ui.lane = l.dataset.wlane as 'ref' | 'world'; render(); return; }
    const m = el.closest<HTMLElement>('[data-glance]'); if (m) { openRow(m.dataset.glance!); return; }
    const fam = el.closest<HTMLElement>('[data-wfamily]'); if (fam) { toggleFamily(Number(fam.dataset.wfamily)); return; }
    const wh = el.closest<HTMLElement>('[data-wwhere]'); if (wh) { where(Number(wh.dataset.wwhere)); return; }
    const sel = el.closest<HTMLElement>('[data-wselect]'); if (sel) { ctx.select(Number(sel.dataset.wselect)); close(); return; }
  });
  root.addEventListener('change', e => { const s = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-warm]'); if (s) { ui.arm = s.value; for (const k of [...parts.keys()]) if (k !== 'guide') parts.delete(k); render(); } });
  // A row's detail is rendered when it opens (and kept in step by later refreshes while it stays open).
  root.addEventListener('toggle', e => {
    const d = e.target as HTMLElement;
    if (!(d instanceof HTMLDetailsElement) || !d.dataset.row) return;
    const id = d.dataset.row, isOpen = d.open;
    if (isOpen === openRows.has(id)) return;
    if (isOpen) openRows.add(id); else openRows.delete(id);
    if (isOpen && lite && ref) { const t = lite.targets.find(x => x.id === id); const body = d.querySelector<HTMLElement>('.ys-detail'); if (t && body) { const n = now(); const v = view(t, n); body.innerHTML = v.detail || detailHtml(v, lite.sources, ref.arms, n.matching); } }
    for (const k of [...parts.keys()]) if (k.startsWith('rows-')) parts.delete(k);   // the open set is part of the rows' markup
  }, true);
  main.addEventListener('scroll', () => syncNav(), { passive: true });
  let navAt = 0;
  function syncNav() {
    const t = performance.now(); if (t - navAt < 120) return; navAt = t;
    let cur = 'glance';
    const top = main.getBoundingClientRect().top;
    for (const s of main.querySelectorAll<HTMLElement>('.w-chap')) if (s.getBoundingClientRect().top - top < 120) cur = s.dataset.sec!;
    nav.querySelectorAll<HTMLElement>('[data-wgo]').forEach(b => setAttr(b, 'aria-current', String(b.dataset.wgo === cur)));
  }
  // Focus stays inside the sheet.
  panel.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...panel.querySelectorAll<HTMLElement>('button, select, summary, a[href], [tabindex="0"]')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });

  function toggleFamily(id: number) {
    const box = main.querySelector<HTMLElement>(`[data-family-of="${id}"]`);
    if (!box) return;
    if (box.innerHTML) { box.innerHTML = ''; return; }
    const w = ctx.world(), c = w.chimps.find(x => x.id === id); if (!c) return;
    const nm = (k: number) => { const x = w.chimps.find(y => y.id === k); return x ? `${esc(x.name)}${x.alive ? '' : ' †'}` : 'unknown'; };
    const kids = w.chimps.filter(x => x.motherId === id || x.fatherId === id);
    const sibs = c.motherId >= 0 ? w.chimps.filter(x => x.motherId === c.motherId && x.id !== id) : [];
    box.innerHTML = `<p class="w-sub">Mother ${c.motherId >= 0 ? nm(c.motherId) : 'unknown (a founder)'} · genetic sire ${c.fatherId >= 0 ? nm(c.fatherId) : 'unknown'}${sibs.length ? ` · maternal siblings ${sibs.map(x => nm(x.id)).join(', ')}` : ''}${kids.length ? ` · offspring ${kids.map(x => nm(x.id)).join(', ')}` : ''}. † has died.</p>`;
  }
  function where(id: number) {
    const w = ctx.world(), c = w.chimps.find(x => x.id === id); if (!c) return;
    close();
    ctx.setView('rts');
    ctx.deps.getScene()?.panTo(c.position[0], c.position[2]);
    ctx.showRecords?.(true);
    const day = c.deathTime !== null ? ` on day ${dayOf(c.deathTime)}` : '';
    ctx.notify({ text: modelIdentityOf(w).bodiesMove ? `${c.name}’s body lies here (died${day}; bodies can be moved after death in this world). Records on the map card show where every body lies.` : `${c.name} died here${day}. Records on the map card show every death place.`, cat: 'life', title: 'Where' });
  }

  function close() {
    if (!open) return;
    open = false; root.hidden = true;
    ctx.wildClosed?.();
    (lastFocus && lastFocus.isConnected ? lastFocus : document.querySelector<HTMLElement>('.viewport'))?.focus({ preventScroll: true });
  }

  return {
    get open() { return open; },
    async show(section?: string) {
      lastFocus = document.activeElement as HTMLElement | null;
      open = true; root.hidden = false;
      render();
      requestAnimationFrame(() => panel.querySelector<HTMLElement>('[data-wact="close"]')?.focus({ preventScroll: true }));
      await load();
      if (!open) return;
      render(section);
      if (section) requestAnimationFrame(() => go(section));
    },
    close,
    /** From the interface refresh (4 Hz): at most once a second, and only when a birth, a death or the day changed. */
    update(force = false) {
      if (!open || !lite || !ref) return;
      const w = ctx.world(), id = w.parties.filter(p => p.kind === 'patrol').map(p => `${p.id}:${p.patrolPhase}`).join(',');
      const k = `${w.seed}|${w.stats.births}|${w.stats.deaths}|${dayOf(w.time)}|${w.modelPolicy.mode}|${w.stimuli.length}|${id}|${ui.lane}|${ui.arm}`;
      const t = performance.now();
      if (!force && (k === liveKey || t - renderedAt < 1000)) return;
      liveKey = k;
      render();
    },
    /** Another world was opened: the page forgets this world's parts. */
    reset() { built = false; pending = null; parts.clear(); openRows.clear(); lifeCache = null; lifeFor = ''; if (open) render(); },
  };
}
export type WildPage = ReturnType<typeof createWildPage>;
