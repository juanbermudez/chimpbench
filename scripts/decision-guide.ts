// Builds the generated parts of docs/decision-guide.html, the visual guide to how the chimpanzees decide on the Track E
// candidate stack S3, from the prescription ledger (scripts/prescription-ledger.ts, scripts/lib/prescriptions.ts) and
// the editorial content in scripts/lib/decision-guide-content.ts.
//
//   pnpm exec tsx scripts/decision-guide.ts            # rewrite the generated regions of docs/decision-guide.html
//   pnpm exec tsx scripts/decision-guide.ts --check    # exit 1 if the page is stale or disagrees with the ledger
//
// Generated, never typed: which entries are prescriptions on today's model (every Track E switch 0) and on S3, their
// values, units, classes, kinds and encoded target rows, the switch and stage that took each one out, every count on
// the page, and what each layer outside S3 would remove. The page keeps its hand-written CSS, script and prose between
// the regions; numbers in the prose sit in <span data-n="…"> elements that this script fills.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { buildLedger } from './prescription-ledger';
import { TRACK_E_SWITCHES } from './lib/prescriptions';
import { DIAGRAMS, DOMAINS, IN_S3_BECAUSE, LITERALS, OVERVIEW, STAGES, STEP_OF, STEPS, SWITCH_VERDICT, type DiagramSpec, type EdgeSpec, type NodeSpec, type Side, type Status, type Step } from './lib/decision-guide-content';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = join(ROOT, 'docs/decision-guide.html');

/** S3, the integrated confirm of the provisional candidates (docs/staging/e-stack2-confirm.md, "S3 confirm"). */
export const S3: Record<string, number> = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1, nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1, waterLedger: 1 };
/** Layers outside S3, each measured on S3 (handoff §3, e5a-prereg.md, e4e-prereg.md, e1k-prereg.md, e4d-prereg.md, e3-prereg.md). */
export const LAYERS: { key: string; stage: string; label: string; status: string; on: Record<string, number> }[] = [
  { key: 'E5a', stage: 'E5a', label: 'E4g + E5a, party cohesion', status: 'confirmed on its own, not integrated: interacts with calls', on: { followCarer: 1, cohesionValue: 1 } },
  { key: 'E4g', stage: 'E4g', label: 'E4g alone, the care-follow fix', status: 'confirmed with E5a, not integrated', on: { followCarer: 1 } },
  { key: 'E1n', stage: 'E1n', label: 'E1n, the mother decides', status: 'provisional keep candidate, not integrated', on: { weanDecide: 1 } },
  { key: 'E4e', stage: 'E4e', label: 'E4e, a hunt valued as food', status: 'held off', on: { huntValue: 1 } },
  { key: 'E1k', stage: 'E1k', label: "E1k, the groomer's own need", status: 'recorded, off', on: { groomNeedDyad: 1 } },
  { key: 'E4d', stage: 'E4d', label: 'E4d, sleep-gated hormone rhythm', status: 'recorded, off', on: { endoRhythm: 1 } },
  { key: 'E3', stage: 'E3', label: 'E3, urgency', status: 'stopped, off', on: { urgencyChoice: 1, urgencyPersist: 1, urgencySwitchCost: 1 } },
];

const fail = (msg: string): never => { throw new Error(`decision-guide: ${msg}`); };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (v: number) => Number.isInteger(v) ? String(v) : String(+v.toPrecision(4));
const clock = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

// ---------------------------------------------------------------------------------------------------------------------
// The ledger, on today's model (B), on S3 and on each layer
// ---------------------------------------------------------------------------------------------------------------------

type Ledger = ReturnType<typeof buildLedger>;
type Row = Ledger['rows'][number];
export interface Entry {
  key: string; type: 'param' | 'literal'; label: string; value: string; units: string; cls: string; kind: string; evidence: string;
  encodes: string[]; reason: string; borderline: boolean; b: boolean; s3: boolean; layers: Record<string, boolean>;
  /** Replaced in S3: the switch that takes it out alone (with what it needs), its stage. */
  by?: string; stage?: string; needs?: string[]; why?: string; where?: string; code?: string;
}

function literalKey(file: string, text: string): string | undefined {
  const hits = LITERALS.filter(l => l.file === file && text.includes(l.has));
  if (hits.length > 1) fail(`literal ${file} "${text.slice(0, 60)}" matches ${hits.length} keys`);
  return hits[0]?.key;
}
const counted = (L: Ledger) => new Set([...L.rows.filter(r => r.cls === 'outcome-encoding' && r.active).map(r => r.id),
  ...L.literals.filter(l => l.counted).map(l => literalKey(l.file, l.text) ?? fail(`counted literal ${l.file}:${l.line} has no key in LITERALS`))]);

/** Switches a switch needs, itself included (TRACK_E_SWITCHES.needs, transitively). */
function closure(s: string, acc = new Set<string>()): Set<string> {
  if (acc.has(s)) return acc;
  acc.add(s);
  for (const n of Object.keys(TRACK_E_SWITCHES[s]?.needs ?? {})) closure(n, acc);
  return acc;
}

export function buildData() {
  const B = buildLedger({}), L3 = buildLedger(S3);
  const layerLedgers = Object.fromEntries(LAYERS.map(l => [l.key, buildLedger({ ...S3, ...l.on } as never)]));
  const setB = counted(B), set3 = counted(L3);
  const layerSets = Object.fromEntries(Object.entries(layerLedgers).map(([k, L]) => [k, counted(L)]));
  // the switch that removes each replaced entry alone (with its needs), the one that needs least: the mechanism's own
  const solo = Object.fromEntries(Object.keys(S3).map(s => [s, counted(buildLedger(Object.fromEntries([...closure(s)].map(q => [q, 1])) as never))]));
  const reg = new Map<string, Row>(L3.rows.map(r => [r.id, r]));
  const entries = new Map<string, Entry>();
  const allKeys = new Set([...setB, ...set3, ...Object.values(layerSets).flatMap(s => [...s])]);
  for (const key of allKeys) {
    const lit = key.startsWith('lit:');
    const layers = Object.fromEntries(LAYERS.map(l => [l.key, layerSets[l.key].has(key)]));
    const e: Entry = { key, type: lit ? 'literal' : 'param', label: key, value: '', units: '', cls: 'outcome-encoding', kind: '', evidence: '', encodes: [], reason: '', borderline: false, b: setB.has(key), s3: set3.has(key), layers };
    if (lit) {
      const spec = LITERALS.find(l => l.key === key)!;
      const l = B.literals.find(q => q.file === spec.file && q.text.includes(spec.has)) ?? fail(`literal ${key} not found by the lint`);
      Object.assign(e, { label: spec.label, value: l.values.join(', '), units: l.kind === 'hour' ? 'hour of day' : l.kind === 'probability' ? 'probability' : 'acts allowed', kind: l.kind === 'hour' ? 'clock (code)' : l.kind === 'probability' ? 'dice (code)' : 'menu (code)', where: `src/sim/${l.file}:${l.line}`, code: l.text.slice(0, 140), reason: l.why });
    } else {
      const r = reg.get(key) ?? fail(`unknown registry id ${key}`);
      const units = r.units === 'h (time of day)' ? `h (${clock(r.fieldValue)})` : r.units;
      Object.assign(e, { value: fmt(r.fieldValue), units, cls: r.cls, kind: r.kind, evidence: r.evidence, encodes: r.encodes, reason: r.reason, borderline: r.borderline, where: r.file ? `src/sim/${r.file}` : undefined });
    }
    if (e.b && !e.s3) {
      const by = Object.keys(S3).filter(s => !solo[s].has(key)).sort((a, b) => closure(a).size - closure(b).size || a.localeCompare(b))[0] ?? fail(`no single S3 switch removes ${key}`);
      e.by = by; e.stage = TRACK_E_SWITCHES[by].stage; e.needs = [...closure(by)].filter(s => s !== by);
      e.why = lit ? (L3.literals.find(q => literalKey(q.file, q.text) === key)?.why ?? '') : (L3.rows.find(q => q.id === key)?.activeNote ?? '');
    }
    entries.set(key, e);
  }
  const layerEffect = Object.fromEntries(LAYERS.map(l => {
    const s = layerSets[l.key];
    return [l.key, { total: layerLedgers[l.key].count.total, removed: [...set3].filter(k => !s.has(k)), added: [...s].filter(k => !set3.has(k)) }];
  }));
  return { B, L3, entries, reg, setB, set3, layerEffect, layerLedgers };
}
export type Data = ReturnType<typeof buildData>;

// ---------------------------------------------------------------------------------------------------------------------
// Checks: the content may group and describe, never decide status or membership
// ---------------------------------------------------------------------------------------------------------------------

/** A diagram with every coordinate moved by its dx (and its width reduced by it). */
function shifted(d: DiagramSpec): DiagramSpec {
  const dx = d.dx ?? 0;
  if (!dx) return d;
  return { ...d, dx: 0, w: d.w + dx, nodes: d.nodes.map(n => ({ ...n, x: n.x + dx })), zones: d.zones?.map(z => ({ ...z, x: z.x + dx })),
    edges: d.edges.map(e => ({ ...e, via: e.via?.map(([x, y]) => [x + dx, y] as [number, number]), mx: e.mx === undefined ? undefined : e.mx + dx, lx: e.lx === undefined ? undefined : e.lx + dx })) };
}
const DGS = DIAGRAMS.map(shifted);

export function checkContent(D: Data): string[] {
  const errs: string[] = [];
  const inDomain = new Map<string, string>();
  for (const d of DOMAINS) for (const k of d.ids) {
    if (inDomain.has(k)) errs.push(`${k} is in domains ${inDomain.get(k)} and ${d.key}`);
    inDomain.set(k, d.key);
    if (!D.setB.has(k)) errs.push(`domain ${d.key} lists ${k}, which is not a counted prescription on today's model`);
  }
  for (const k of D.setB) {
    if (!inDomain.has(k)) errs.push(`counted prescription ${k} is in no domain`);
    if (!STEP_OF[k]) errs.push(`counted prescription ${k} has no step in STEP_OF`);
  }
  for (const k of D.set3) if (!D.setB.has(k)) errs.push(`${k} is counted on S3 but not on today's model (the page assumes S3 only removes)`);
  for (const k of Object.keys(STEP_OF)) if (!D.setB.has(k)) errs.push(`STEP_OF names ${k}, not a counted prescription`);
  const shown = new Set<string>();
  for (const d of DGS) {
    if (!DOMAINS.find(x => x.key === d.key)) errs.push(`diagram ${d.key} has no domain`);
    const keys = new Set(d.nodes.map(n => n.k));
    if (keys.size !== d.nodes.length) errs.push(`diagram ${d.key} repeats a node key`);
    for (const n of d.nodes) {
      for (const k of n.ids ?? []) { if (!D.setB.has(k)) errs.push(`${d.key}.${n.k}: ${k} is not a counted prescription`); shown.add(k); }
      const st = nodeStatus(D, n);
      if (!st) errs.push(`${d.key}.${n.k}: mixed or missing status`);
      if (n.ids?.length && n.st) errs.push(`${d.key}.${n.k}: has both counted ids and an explicit status`);
      for (const p of n.ps ?? []) {
        const r = D.reg.get(p);
        if (!r) { errs.push(`${d.key}.${n.k}: unknown registry id ${p}`); continue; }
        if (st === 'inp' && r.cls !== 'input') errs.push(`${d.key}.${n.k}: ${p} is ${r.cls}, shown on an input box`);
        if (st === 'des' && r.cls !== 'design') errs.push(`${d.key}.${n.k}: ${p} is ${r.cls}, shown on a design box`);
        if (r.cls === 'outcome-encoding' && D.set3.has(p) && st !== 'rem') errs.push(`${d.key}.${n.k}: ${p} is still prescribed but listed on a ${st} box`);
      }
      if (st === 'lay') {
        if (!n.layer) errs.push(`${d.key}.${n.k}: layer box without layer`);
        else {
          if (!STAGES[n.layer.stage]) errs.push(`${d.key}.${n.k}: unknown stage ${n.layer.stage}`);
          for (const s of n.layer.sw) { if (!TRACK_E_SWITCHES[s]) errs.push(`${d.key}.${n.k}: unknown switch ${s}`); if (S3[s]) errs.push(`${d.key}.${n.k}: ${s} is in S3`); }
        }
      }
      if (st === 'rep' && !n.before) errs.push(`${d.key}.${n.k}: replaced box without its old rule`);
      if (st === 'rep' && !n.now) errs.push(`${d.key}.${n.k}: replaced box without its mechanism`);
      const need = 42 + 15 * (n.t.split('\n').length - 1) + (n.s ? 16 + 13 * (n.s.split('\n').length - 1) : 0) + 10;
      if (n.h < need) errs.push(`${d.key}.${n.k}: height ${n.h} < ${need} for its lines`);
      for (const line of n.t.split('\n')) if (textW(line, 12, 600) > n.w - 24) errs.push(`${d.key}.${n.k}: title line "${line}" ~${Math.round(textW(line, 12, 600))} px > ${n.w - 24}`);
      for (const line of (n.s ?? '').split('\n')) if (line && line.length * 6.02 > n.w - 24) errs.push(`${d.key}.${n.k}: sub line "${line}" ~${Math.round(line.length * 6.02)} px > ${n.w - 24}`);
      if (n.x % 4 || n.y % 4 || n.w % 4 || n.h % 4) errs.push(`${d.key}.${n.k}: off the 4 px grid`);
      if (n.x < 8 || n.x + n.w > d.w - 8 || n.y + n.h > d.h - 8) errs.push(`${d.key}.${n.k}: outside the view box`);
    }
    for (const e of d.edges) for (const k of [e.f, e.t]) if (!keys.has(k)) errs.push(`${d.key}: edge to unknown node ${k}`);
    for (const z of [...(d.notes ?? [])].join(' ').matchAll(/href="([^"#]+)/g)) if (!existsSync(join(ROOT, 'docs', z[1]))) errs.push(`${d.key}: broken link ${z[1]}`);
  }
  for (const k of D.setB) if (!shown.has(k)) errs.push(`counted prescription ${k} is shown in no diagram box`);
  for (const s of Object.keys(S3)) if (!TRACK_E_SWITCHES[s] || !STAGES[TRACK_E_SWITCHES[s].stage]) errs.push(`S3 switch ${s} has no stage entry`);
  for (const l of LAYERS) for (const s of Object.keys(l.on)) if (!TRACK_E_SWITCHES[s]) errs.push(`layer ${l.key}: unknown switch ${s}`);
  for (const st of Object.values(STAGES)) if (!existsSync(join(ROOT, 'docs', st.doc))) errs.push(`stage document ${st.doc} is missing`);
  return errs;
}

/** Width estimate of Instrument Sans text, for layout checks only (the browser check measures the real one). */
function textW(s: string, size: number, weight: number): number {
  let w = 0;
  for (const ch of s) w += /[il.,:;'’|!()\[\] ]/.test(ch) ? 0.28 : /[mwMW]/.test(ch) ? 0.82 : /[A-Z]/.test(ch) ? 0.66 : /[0-9]/.test(ch) ? 0.56 : /[ft]/.test(ch) ? 0.34 : /[rj]/.test(ch) ? 0.38 : 0.53;
  return w * size * (weight >= 600 ? 1.03 : 1);
}

function nodeStatus(D: Data, n: NodeSpec): Status | null {
  if (n.ids?.length) {
    const sts = new Set(n.ids.map(k => D.setB.has(k) ? (D.set3.has(k) ? 'rem' : 'rep') : 'x'));
    return sts.size === 1 && !sts.has('x') ? [...sts][0] as Status : null;
  }
  return n.st ?? null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------------------------------------------------

const ST: Record<Status, { chip: string; long: string; icon: string }> = {
  rem: { chip: 'PRESCRIBED', long: 'Still prescribed in S3', icon: 'ic-rem' },
  rep: { chip: 'REPLACED', long: 'Replaced in S3', icon: 'ic-rep' },
  inp: { chip: 'INPUT', long: 'Physiology or physics input', icon: 'ic-inp' },
  des: { chip: 'DESIGN', long: 'Design weight or structure', icon: 'ic-des' },
  lay: { chip: 'NOT IN S3', long: 'Not in S3', icon: 'ic-lay' },
};
const chipOf = (st: Status, n?: NodeSpec) => st === 'lay' && n?.layer ? n.layer.tag : ST[st].chip;
const longOf = (st: Status, n?: NodeSpec) => st === 'lay' && n?.layer ? `Not in S3: ${n.layer.tag.toLowerCase()}` : ST[st].long;

type Box = { x: number; y: number; w: number; h: number };
function port(b: Box, side: Side, off = 0): [number, number] {
  return side === 'l' ? [b.x, b.y + b.h / 2 + off] : side === 'r' ? [b.x + b.w, b.y + b.h / 2 + off] : side === 't' ? [b.x + b.w / 2 + off, b.y] : [b.x + b.w / 2 + off, b.y + b.h];
}
/** Default sides: down the spine when stacked, else across. */
function sides(a: Box, b: Box): [Side, Side] {
  const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
  if (overlapX) return a.y < b.y ? ['b', 't'] : ['t', 'b'];
  return a.x < b.x ? ['r', 'l'] : ['l', 'r'];
}
function route(e: EdgeSpec, a: Box, b: Box): [number, number][] {
  const [ds, dt] = sides(a, b);
  const fs = e.fs ?? ds, ts = e.ts ?? dt;
  const p0 = port(a, fs, e.fo ?? 0), p1 = port(b, ts, e.to ?? 0);
  if (e.via) return [p0, ...e.via, p1];
  const hz = (s: Side) => s === 'l' || s === 'r';
  if (hz(fs) && hz(ts)) {
    if (p0[1] === p1[1]) return [p0, p1];
    const mx = e.mx ?? (p0[0] + p1[0]) / 2;
    return [p0, [mx, p0[1]], [mx, p1[1]], p1];
  }
  if (!hz(fs) && !hz(ts)) {
    if (p0[0] === p1[0]) return [p0, p1];
    const my = e.my ?? (p0[1] + p1[1]) / 2;
    return [p0, [p0[0], my], [p1[0], my], p1];
  }
  return hz(fs) ? [p0, [p1[0], p0[1]], p1] : [p0, [p0[0], p1[1]], p1];
}
/** An orthogonal polyline with rounded corners (radius 8, less on short legs). */
function pathD(raw: [number, number][], r = 8): string {
  const pts = raw.filter((p, i) => i === 0 || p[0] !== raw[i - 1][0] || p[1] !== raw[i - 1][1]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i - 1], [px, py] = pts[i], [cx, cy] = pts[i + 1];
    const l1 = Math.hypot(px - ax, py - ay), l2 = Math.hypot(cx - px, cy - py), rr = Math.min(r, l1 / 2, l2 / 2);
    const ux = (px - ax) / l1, uy = (py - ay) / l1, vx = (cx - px) / l2, vy = (cy - py) / l2;
    d += ` L${px - ux * rr},${py - uy * rr} Q${px},${py} ${px + vx * rr},${py + vy * rr}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L${lx},${ly}`;
}
function label(text: string, cx: number, cy: number): string {
  const w = Math.ceil(textW(text, 10, 400)) + 10;
  return `<rect class="ed-m" x="${cx - w / 2}" y="${cy - 8}" width="${w}" height="14" rx="3"/><text class="ed-l" x="${cx}" y="${cy + 3}" text-anchor="middle">${esc(text)}</text>`;
}
function edgeSvg(e: EdgeSpec, boxes: Map<string, Box>): { path: string; label: string } {
  const pts = route(e, boxes.get(e.f)!, boxes.get(e.t)!);
  const cls = e.kind === 'lay' ? 'ed lay' : e.kind === 'side' ? 'ed side' : 'ed';
  const marker = e.kind === 'lay' ? 'dg-ah-l' : 'dg-ah';
  return { path: `<path class="${cls}" d="${pathD(pts)}" marker-end="url(#${marker})"/>`, label: e.l ? label(e.l, e.lx ?? (pts[0][0] + pts[1][0]) / 2, e.ly ?? pts[0][1] - 14) : '' };
}

function nodeSvg(diagram: string, n: NodeSpec, st: Status): string {
  const t = n.t.split('\n'), s = (n.s ?? '').split('\n').filter(Boolean);
  const chip = chipOf(st, n), cw = 26 + Math.ceil(chip.length * 5.6);
  const title = t.map((line, i) => `<text class="nd-t" x="${n.x + 12}" y="${n.y + 42 + 15 * i}">${esc(line)}</text>`).join('');
  const sy = n.y + 42 + 15 * (t.length - 1) + 16;
  const sub = s.map((line, i) => `<text class="nd-s" x="${n.x + 12}" y="${sy + 13 * i}">${esc(line)}</text>`).join('');
  const id = `tv-${diagram}-${n.k}`;
  return `<g class="nd st-${st}" tabindex="0" role="button" aria-label="${esc(`${longOf(st, n)}: ${t.join(' ')}`)}" aria-describedby="${id}" data-tip="${id}">`
    + `<rect class="nd-ring" x="${n.x - 3}" y="${n.y - 3}" width="${n.w + 6}" height="${n.h + 6}" rx="10"/>`
    + `<rect class="nd-bg" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8"/>`
    + `<rect class="nd-chip" x="${n.x + 10}" y="${n.y + 9}" width="${cw}" height="16" rx="4"/>`
    + `<use class="nd-ic" href="#${ST[st].icon}" x="${n.x + 14}" y="${n.y + 12}" width="10" height="10"/>`
    + `<text class="nd-ct" x="${n.x + 29}" y="${n.y + 20}">${esc(chip)}</text>${title}${sub}</g>`;
}

function svgDiagram(D: Data, d: DiagramSpec): string {
  const boxes = new Map<string, Box>(d.nodes.map(n => [n.k, n]));
  const edges = d.edges.map(e => edgeSvg(e, boxes));
  const zones = (d.zones ?? []).map(z => `<rect class="zn" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="10"/><text class="zn-l" x="${z.x + 14}" y="${z.y + 20}">${esc(z.label)}</text>`).join('');
  const nodes = d.nodes.map(n => nodeSvg(d.key, n, nodeStatus(D, n)!)).join('');
  return `<svg class="dg-svg" viewBox="0 0 ${d.w} ${d.h}" style="max-width:${d.w}px" role="group" aria-labelledby="dg-${d.key}-title dg-${d.key}-desc" data-w="${d.w}">`
    + `<title id="dg-${d.key}-title">${esc(d.title)}</title><desc id="dg-${d.key}-desc">${esc(d.desc)}</desc>`
    + `${zones}<g class="eds">${edges.map(e => e.path).join('')}</g><g class="els">${edges.map(e => e.label).join('')}</g><g class="nds">${nodes}</g></svg>`;
}

// --- detail text (the text version of each figure, which the tooltips show) -------------------------------------------

function paramLine(D: Data, key: string): string {
  const e = D.entries.get(key);
  if (e) {
    const tags = [e.units === e.kind ? '' : e.kind, e.encodes.length ? e.encodes.join(', ') : '', e.borderline ? 'judgement call' : ''].filter(Boolean).join(' · ');
    const val = e.type === 'literal' ? `${e.value ? `<span class="tt-v">${esc(e.kind.startsWith('clock') ? `hours ${e.value}` : e.value)}</span> ` : ''}<span class="tt-w">${esc(e.where ?? '')}</span>` : `<span class="tt-v">${esc(e.value)} ${esc(e.units)}</span>`;
    return `<li><code>${esc(e.type === 'literal' ? e.label : e.key)}</code> ${val}${tags ? ` <em>· ${esc(tags)}</em>` : ''}</li>`;
  }
  const r = D.reg.get(key) ?? fail(`unknown registry id ${key}`);
  const units = r.units === 'h (time of day)' ? `h (${clock(r.fieldValue)})` : r.units;
  return `<li><code>${esc(key)}</code> <span class="tt-v">${esc(fmt(r.fieldValue))} ${esc(units)}</span> <em>· ${esc(r.cls)}${r.evidence ? `, evidence ${esc(r.evidence)}` : ''}</em></li>`;
}
function stageLine(sw: string): string {
  const stg = TRACK_E_SWITCHES[sw].stage, st = STAGES[stg], own = SWITCH_VERDICT[sw];
  const why = IN_S3_BECAUSE[sw] ? `; in S3: ${IN_S3_BECAUSE[sw]}` : '';
  const doc = own?.doc ?? st.doc;
  return `<code>${esc(sw)}</code> · stage ${esc(stg)}, ${esc(st.name)} · verdict: ${esc(own?.verdict ?? st.verdict)}${esc(why)} (<a href="${doc}">${esc(doc.replace('staging/', ''))}</a>)`;
}
function tipHtml(D: Data, d: DiagramSpec, n: NodeSpec): string {
  const st = nodeStatus(D, n)!;
  const head = `<div class="tt-h"><span class="chip st-${st}"><svg class="ic" aria-hidden="true"><use href="#${ST[st].icon}"/></svg>${esc(longOf(st, n))}</span><b>${esc(n.t.replace(/\n/g, ' '))}</b></div>`;
  const ids = (n.ids ?? []).map(k => paramLine(D, k)).join(''), ps = (n.ps ?? []).map(k => paramLine(D, k)).join('');
  const parts: string[] = [head];
  if (st === 'rep') {
    const bys = [...new Set(n.ids!.map(k => D.entries.get(k)!.by!))];
    parts.push(`<div class="tt-s"><span class="tt-k k-before">Before</span><p>${esc(n.before!)}</p><ul class="tt-ps">${ids}</ul></div>`);
    parts.push(`<div class="tt-s"><span class="tt-k k-now">Now</span><p>${esc(n.now!)}</p>${ps ? `<ul class="tt-ps">${ps}</ul>` : ''}</div>`);
    parts.push(`<p class="tt-m">Switched out by ${bys.map(stageLine).join('; ')}${n.see ? `. Counted under ${esc(DOMAINS.find(x => x.key === n.see)!.title)}` : ''}.</p>`);
  } else if (st === 'rem') {
    const would = LAYERS.filter(l => n.ids!.every(k => D.layerEffect[l.key].removed.includes(k)));
    parts.push(`<div class="tt-s"><span class="tt-k k-rem">Still prescribed</span><p>${esc(n.text ?? '')}</p><ul class="tt-ps">${ids}</ul>${ps ? `<ul class="tt-ps tt-rel">${ps}</ul>` : ''}</div>`);
    if (would.length) parts.push(`<p class="tt-m">Would be switched out by ${would.map(l => `${esc(l.label)} (${esc(l.status)})`).join('; ')}.</p>`);
  } else if (st === 'lay') {
    const same = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));
    const L = LAYERS.find(l => same(Object.keys(l.on), n.layer!.sw)) ?? LAYERS.find(l => l.stage === n.layer!.stage), eff = L ? D.layerEffect[L.key] : undefined, stg = STAGES[n.layer!.stage];
    const removes = eff ? (eff.removed.length ? `Would switch out on S3: ${eff.removed.map(k => `<code>${esc(D.entries.get(k)?.label ?? k)}</code>`).join(' ')}${eff.added.length ? `, and bring back ${eff.added.map(k => `<code>${esc(k)}</code>`).join(' ')}` : ''} (${eff.total} prescriptions instead of ${D.L3.count.total}).` : `Switches out nothing on S3 (${eff.total} prescriptions).`) : 'Not merged: the ledger cannot measure it yet.';
    parts.push(`<div class="tt-s"><span class="tt-k k-lay">${esc(n.layer!.tag.toLowerCase())}</span><p>${esc(n.text ?? '')}</p></div>`);
    parts.push(`<p class="tt-m">${n.layer!.sw.length ? `${n.layer!.sw.map(s => `<code>${esc(s)}</code>`).join(' ')} · ` : ''}stage ${esc(n.layer!.stage)}, ${esc(stg.name)} · ${esc(stg.verdict)} (<a href="${stg.doc}">${esc(stg.doc.replace('staging/', ''))}</a>). ${removes}</p>`);
  } else {
    parts.push(`<div class="tt-s"><span class="tt-k k-${st}">${st === 'inp' ? 'Input' : 'Design'}</span><p>${esc(n.text ?? '')}</p>${ps ? `<ul class="tt-ps">${ps}</ul>` : ''}</div>`);
    if (st === 'des') parts.push('<p class="tt-m">Design: a weight or structure that states no outcome; not counted as a prescription.</p>');
  }
  if (n.note) parts.push(`<p class="tt-n">${esc(n.note)}</p>`);
  return `<li class="tv st-${st}" id="tv-${d.key}-${n.k}">${parts.join('')}</li>`;
}

function legendHtml(sts: Status[], layer: boolean): string {
  const items = (['rem', 'rep', 'inp', 'des', 'lay'] as Status[]).filter(s => sts.includes(s)).map(s => `<span class="lg st-${s}"><svg class="ic" aria-hidden="true"><use href="#${ST[s].icon}"/></svg>${esc(ST[s].long)}</span>`);
  return `<div class="dg-legend">${items.join('')}${layer ? '<span class="lg lg-edge"><i class="sw-lay"></i>a layer outside S3 would change this</span>' : ''}</div>`;
}

// --- tallies ---------------------------------------------------------------------------------------------------------

function tally(D: Data, ids: string[]) {
  const rem = ids.filter(k => D.set3.has(k)), rep = ids.filter(k => D.setB.has(k) && !D.set3.has(k));
  return { b: ids.length, rem: rem.length, rep: rep.length, remIds: rem, repIds: rep };
}
function kinds(D: Data, ids: string[]): string {
  const c: Record<string, number> = {};
  for (const k of ids) { const e = D.entries.get(k)!; c[e.kind] = (c[e.kind] ?? 0) + 1; }
  return Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => `${n} ${k}`).join(' · ');
}
function tallyHtml(t: ReturnType<typeof tally>): string {
  return `<span class="tl st-rem"><svg class="ic" aria-hidden="true"><use href="#ic-rem"/></svg><b>${t.rem}</b> still prescribed</span><span class="tl st-rep"><svg class="ic" aria-hidden="true"><use href="#ic-rep"/></svg><b>${t.rep}</b> replaced in S3</span><span class="tl tl-b">of ${t.b} on today's model</span>`;
}

function countsHtml(D: Data): string {
  const rows = DOMAINS.map(d => {
    const t = tally(D, d.ids), max = Math.max(...DOMAINS.map(x => x.ids.length));
    const lay = LAYERS.map(l => ({ l, n: D.layerEffect[l.key].removed.filter(k => d.ids.includes(k)).length })).filter(x => x.n > 0);
    return `<tr><th scope="row"><a href="#d-${d.key}">${esc(d.title)}</a></th><td class="n">${t.b}</td><td class="n rep${t.rep ? '' : ' z'}">${t.rep}</td><td class="n rem${t.rem ? '' : ' z'}">${t.rem}</td>`
      + `<td class="bar" aria-hidden="true"><span class="b-rep" style="width:${(t.rep / max * 100).toFixed(2)}%"></span><span class="b-rem" style="width:${(t.rem / max * 100).toFixed(2)}%"></span></td>`
      + `<td class="k">${esc(kinds(D, t.remIds)) || '—'}${lay.length ? `<br><span class="k-lay">${lay.map(x => `−${x.n} with ${esc(x.l.label.split(',')[0])} (${esc(x.l.status)})`).join('; ')}</span>` : ''}</td></tr>`;
  }).join('');
  const all = tally(D, DOMAINS.flatMap(d => d.ids));
  return `<div class="ct-wrap"><table class="ct"><caption class="sr">Prescriptions by domain on today's model and on S3</caption><thead><tr><th scope="col">Domain</th><th scope="col" class="n">Today</th><th scope="col" class="n">Replaced</th><th scope="col" class="n">Still prescribed</th><th scope="col"><span class="sr">Bar</span></th><th scope="col" class="k">Kinds still prescribed</th></tr></thead><tbody>${rows}</tbody>`
    + `<tfoot><tr><th scope="row">All</th><td class="n">${all.b}</td><td class="n rep">${all.rep}</td><td class="n rem">${all.rem}</td><td></td><td class="k">${esc(kinds(D, all.remIds))}</td></tr></tfoot></table></div>`;
}

function layersHtml(D: Data): string {
  return `<ul class="lyr">${LAYERS.map(l => {
    const e = D.layerEffect[l.key], stg = STAGES[l.stage];
    const delta = e.total - D.L3.count.total;
    return `<li><span class="lyr-n">${e.total}</span><div><b>${esc(l.label)}</b> <span class="lyr-s">${esc(l.status)}</span><p>${delta === 0 ? 'Switches out nothing on S3.' : `${delta} on S3: ${e.removed.map(k => `<code>${esc(D.entries.get(k)?.label ?? k)}</code>`).join(', ')}${e.added.length ? ` out; ${e.added.map(k => `<code>${esc(k)}</code>`).join(', ')} back in` : ''}.`} <a href="${stg.doc}">${esc(stg.doc.replace('staging/', ''))}</a></p></div></li>`;
  }).join('')}</ul>`;
}

// --- the overview --------------------------------------------------------------------------------------------------

function overviewSvg(D: Data): { svg: string; items: string } {
  const O = OVERVIEW, byStep = (s: Step) => tally(D, [...D.setB].filter(k => STEP_OF[k] === s));
  const chips = (x: number, y: number, t: ReturnType<typeof tally>) => {
    let cx = x, out = '';
    for (const [s, n] of [['rem', t.rem], ['rep', t.rep]] as [Status, number][]) {
      if (!n) continue;
      const w = 26 + String(n).length * 7;
      out += `<g class="st-${s}"><rect class="ov-chip" x="${cx}" y="${y}" width="${w}" height="16" rx="4"/><use class="nd-ic" href="#${ST[s].icon}" x="${cx + 5}" y="${y + 3}" width="10" height="10"/><text class="ov-ct" x="${cx + 19}" y="${y + 12}">${n}</text></g>`;
      cx += w + 6;
    }
    return out;
  };
  const node = (key: string, b: Box & { t: string; s: string }, text: string, body: boolean) => {
    const t = byStep(key as Step), st: Status = t.rem ? 'rem' : t.rep ? 'rep' : 'des', id = `tv-overview-${key.replace(':', '-')}`;
    const subs = b.s ? b.s.split('\n') : [];
    const title = `<text class="nd-t" x="${b.x + 12}" y="${b.y + (body ? 22 : 24)}">${esc(b.t)}</text>`;
    const sub = subs.map((l, i) => `<text class="nd-s" x="${b.x + 12}" y="${b.y + 42 + 13 * i}">${esc(l)}</text>`).join('');
    const label = `${t.rem ? `${t.rem} still prescribed` : 'none still prescribed'}${t.rep ? `, ${t.rep} replaced in S3` : ''}`;
    const svg = `<g class="nd ov st-${st}" tabindex="0" role="button" aria-label="${esc(`${b.t}: ${label}`)}" aria-describedby="${id}" data-tip="${id}">`
      + `<rect class="nd-ring" x="${b.x - 3}" y="${b.y - 3}" width="${b.w + 6}" height="${b.h + 6}" rx="10"/><rect class="nd-bg" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8"/>`
      + `${title}${sub}${chips(b.x + 10, body ? b.y + 31 : b.y + b.h - 28, t)}</g>`;
    const list = (ids: string[]) => {
      const byDom = DOMAINS.map(d => ({ d, ks: ids.filter(k => d.ids.includes(k)) })).filter(x => x.ks.length);
      return `<ul class="tt-dom">${byDom.map(x => `<li><a href="#d-${x.d.key}">${esc(x.d.title)}</a> ${x.ks.map(k => `<code>${esc(D.entries.get(k)!.type === 'literal' ? D.entries.get(k)!.label : k)}</code>`).join(' ')}</li>`).join('')}</ul>`;
    };
    const item = `<li class="tv st-${st}" id="${id}"><div class="tt-h"><span class="chip st-${st}"><svg class="ic" aria-hidden="true"><use href="#${ST[st].icon}"/></svg>${esc(st === 'rem' ? 'Carries prescriptions' : st === 'rep' ? 'All replaced in S3' : 'No prescriptions')}</span><b>${esc(b.t)}</b></div>`
      + `<div class="tt-s"><p>${esc(text)}</p></div>`
      + (t.rem ? `<div class="tt-s"><span class="tt-k k-rem">Still prescribed here · ${t.rem}</span>${list(t.remIds)}</div>` : '')
      + (t.rep ? `<div class="tt-s"><span class="tt-k k-now">Replaced in S3 · ${t.rep}</span>${list(t.repIds)}</div>` : '') + `</li>`;
    return { svg, item };
  };
  const parts = [
    ...Object.entries(O.steps).map(([k, b]) => node(k, b, b.text, false)),
    ...Object.entries(O.body.nodes).map(([k, b]) => node(k, b, O.body.text[k], true)),
  ];
  const z = O.body.zone, p = O.steps, my = p.perceive.y + p.perceive.h / 2;
  const E = (pts: [number, number][], cls = 'ed') => `<path class="${cls}" d="${pathD(pts)}" marker-end="url(#dg-ah)"/>`;
  const loopY = O.h - 16, ax = p.act.x + p.act.w / 2;
  const edges = [
    E([[p.perceive.x + p.perceive.w, my], [z.x, my]]),
    E([[z.x + z.w, my], [p.options.x, my]]),
    E([[p.options.x + p.options.w, my], [p.choice.x, my]]),
    E([[p.choice.x + p.choice.w, my], [p.act.x, my]]),
    E([[ax, p.act.y + p.act.h], [ax, p.world.y]]),
    E([[p.world.x + 128, p.world.y + p.world.h], [p.world.x + 128, loopY], [p.perceive.x + p.perceive.w / 2, loopY], [p.perceive.x + p.perceive.w / 2, p.perceive.y + p.perceive.h]], 'ed side'),
  ];
  const svg = `<svg class="dg-svg" viewBox="0 0 ${O.w} ${O.h}" style="max-width:${O.w}px" role="group" aria-labelledby="dg-overview-title dg-overview-desc" data-w="${O.w}">`
    + `<title id="dg-overview-title">One decision</title><desc id="dg-overview-desc">${esc(O.desc)}</desc>`
    + `<rect class="zn" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="10"/><text class="zn-l" x="${z.x + 14}" y="${z.y + 20}">${esc(z.label)}</text>`
    + `<g class="eds">${edges.join('')}</g><g class="els">${label('next decision', 452, loopY - 14)}</g><g class="nds">${parts.map(x => x.svg).join('')}</g></svg>`;
  return { svg, items: parts.map(x => x.item).join('') };
}

// --- sections ------------------------------------------------------------------------------------------------------

function figure(key: string, title: string, svg: string, items: string, sts: Status[], layer: boolean): string {
  return `<figure class="panel dg" id="fig-${key}" aria-labelledby="fig-${key}-t">`
    + `<figcaption class="dg-head"><b id="fig-${key}-t">${esc(title)}</b><button class="dg-x" type="button" data-expand="${key}" aria-haspopup="dialog"><svg class="ic" aria-hidden="true"><use href="#ic-expand"/></svg>Expand</button></figcaption>`
    + `<p class="dg-swipe">Swipe sideways to see all of it, or Expand.</p><div class="dg-frame" data-frame="${key}">${svg}</div>${legendHtml(sts, layer)}`
    + `<details class="dg-text"><summary>Text version and details</summary><ol class="tv-list">${items}</ol></details></figure>`;
}
function sectionHtml(D: Data, d: DiagramSpec, i: number): string {
  const dom = DOMAINS.find(x => x.key === d.key)!, t = tally(D, dom.ids);
  const sts = [...new Set(d.nodes.map(n => nodeStatus(D, n)!))];
  const items = d.nodes.map(n => tipHtml(D, d, n)).join('');
  const notes = d.notes?.length ? `<ul class="dg-notes">${d.notes.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
  return `<section class="sec sub dom" id="d-${d.key}" aria-labelledby="h-${d.key}" data-title="${esc(d.nav)}" data-rem="${t.rem}" data-rep="${t.rep}">`
    + `<header class="sh"><p class="dom-i">${String(i + 1).padStart(2, '0')}</p><h3 id="h-${d.key}">${esc(d.title)}</h3><p>${esc(d.take)}</p><p class="tally">${tallyHtml(t)}</p></header>`
    + figure(d.key, d.title, svgDiagram(D, d), items, sts, d.edges.some(e => e.kind === 'lay')) + notes + `</section>`;
}
function tocHtml(): string {
  return `<li><a href="#read">How to read this page</a></li><li><a href="#count">The count</a></li><li><a href="#overview">One decision</a></li>`
    + `<li class="has-sub"><a href="#domains">Domains</a><ol>${DGS.map(d => `<li><a href="#d-${d.key}">${esc(d.nav)}</a></li>`).join('')}</ol></li>`
    + `<li><a href="#remaining">Still prescribed</a></li><li><a href="#open">Open problems</a></li><li><a href="#method">How this page is made</a></li>`;
}

// --- numbers in the prose, and the embedded data ---------------------------------------------------------------------

function numbers(D: Data): Record<string, string> {
  const repl = [...D.setB].filter(k => !D.set3.has(k));
  const n: Record<string, string> = {
    'B.total': String(D.B.count.total), 'B.registry': String(D.B.count.registryActive), 'B.literals': String(D.B.count.literals),
    'S3.total': String(D.L3.count.total), 'S3.registry': String(D.L3.count.registryActive), 'S3.literals': String(D.L3.count.literals),
    'replaced': String(repl.length), 'replaced.registry': String(repl.filter(k => !k.startsWith('lit:')).length), 'replaced.literals': String(repl.filter(k => k.startsWith('lit:')).length),
    'S3.switches': String(Object.keys(S3).length), 'domains': String(DOMAINS.length), 'diagrams': String(DGS.length + 1),
    'entries': String(D.B.entries), 'S3.outcome': String(D.B.classes['outcome-encoding']),
  };
  for (const l of LAYERS) { const e = D.layerEffect[l.key]; n[`${l.key}.total`] = String(e.total); n[`${l.key}.removed`] = String(e.removed.length); n[`${l.key}.added`] = String(e.added.length); }
  for (const d of DOMAINS) { const t = tally(D, d.ids); n[`dom.${d.key}.rem`] = String(t.rem); n[`dom.${d.key}.rep`] = String(t.rep); n[`dom.${d.key}.b`] = String(t.b); }
  const remKinds: Record<string, number> = {};
  for (const k of D.set3) { const e = D.entries.get(k)!; remKinds[e.kind] = (remKinds[e.kind] ?? 0) + 1; }
  for (const [k, v] of Object.entries(remKinds)) n[`S3.kind.${k}`] = String(v);
  return n;
}
function dataJson(D: Data): string {
  const items = [...D.entries.values()].filter(e => e.b).sort((a, b) => a.key.localeCompare(b.key)).map(e => ({
    key: e.key, type: e.type, domain: DOMAINS.find(d => d.ids.includes(e.key))!.key, step: STEP_OF[e.key], value: e.value, units: e.units, kind: e.kind,
    encodes: e.encodes, b: e.b, s3: e.s3, by: e.by ?? null, stage: e.stage ?? null, where: e.where ?? null,
    layers: Object.fromEntries(Object.entries(e.layers).map(([k, v]) => [k, v])),
  }));
  const body = { tool: 'scripts/prescription-ledger.ts via scripts/decision-guide.ts', profile: 'field', S3, layers: LAYERS.map(l => ({ key: l.key, on: l.on, status: l.status })),
    counts: { B: D.B.count.total, S3: D.L3.count.total, ...Object.fromEntries(LAYERS.map(l => [l.key, D.layerEffect[l.key].total])) }, items };
  return JSON.stringify(body).replace(/</g, '\\u003c');
}

// ---------------------------------------------------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------------------------------------------------

export function render(D: Data, html: string, commit: string): string {
  const ov = overviewSvg(D);
  const overview = `<section class="sec" id="overview" aria-labelledby="h-overview" data-title="One decision" data-rem="${D.L3.count.total}" data-rep="${D.B.count.total - D.L3.count.total}">`
    + `<header class="sh"><h2 id="h-overview">One decision</h2><p>Every act starts the same way. The map shows where in a decision the remaining prescriptions act, and where S3 replaced them. Hover, focus or tap a box for its list.</p></header>`
    + figure('overview', 'One decision, from what a chimp senses to what it does', ov.svg, ov.items, ['rem', 'rep'], false) + `</section>`;
  const domains = `<section class="sec" id="domains" aria-labelledby="h-domains"><header class="sh"><h2 id="h-domains">Domain by domain</h2><p>One diagram per kind of decision. Each box is one rule or mechanism, marked by its status. The count under each title comes from the ledger.</p></header>`
    + DGS.map((d, i) => sectionHtml(D, d, i)).join('') + `</section>`;
  const remKinds: Record<string, number> = {};
  for (const k of D.set3) { const e = D.entries.get(k)!; remKinds[e.kind] = (remKinds[e.kind] ?? 0) + 1; }
  const kindsText = Object.entries(remKinds).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, v]) => `${v} ${esc(k)}`).join(', ');
  const docs = [...new Set(['staging/e-stack2-confirm.md', 'staging/track-e-handoff.md', ...Object.values(STAGES).map(s => s.doc), 'simulation.md', 'research.md'])];
  const sources = docs.map(d => `<li><a href="${d}">${esc(d.replace('staging/', ''))}</a>${d.includes('prereg') ? ` <span>${esc(Object.entries(STAGES).filter(([, s]) => s.doc === d).map(([k, s]) => `${k}, ${s.name}`).join('; '))}</span>` : d === 'staging/e-stack2-confirm.md' ? ' <span>integrated confirms S2, S3 and S4</span>' : d === 'staging/track-e-handoff.md' ? ' <span>Track E handoff and stage ledger</span>' : d === 'simulation.md' ? ' <span>how the simulation works</span>' : ' <span>evidence and sources</span>'}</li>`).join('');
  const regions: Record<string, string> = {
    toc: tocHtml(), counts: countsHtml(D), layers: layersHtml(D), diagrams: overview + domains,
    data: `<script type="application/json" id="dg-data">${dataJson(D)}</script>`, kinds: kindsText, sources,
    stack: esc(JSON.stringify(S3)), stamp: `Generated from <code>${esc(commit)}</code> by <code>scripts/decision-guide.ts</code> with the field profile.`,
  };
  let out = html;
  for (const [name, body] of Object.entries(regions)) {
    const re = new RegExp(`(<!--gen:${name}-->)[\\s\\S]*?(<!--/gen:${name}-->)`, 'g');
    if (!re.test(out)) fail(`region ${name} missing in the page`);
    out = out.replace(re, (_m, a, b) => `${a}${body}${b}`);
  }
  const n = numbers(D);
  out = out.replace(/(<span data-n="([^"]+)">)[^<]*(<\/span>)/g, (_m, a, key, b) => `${a}${n[key] ?? fail(`unknown number ${key}`)}${b}`);
  return out;
}

function checkPage(D: Data, html: string): string[] {
  const errs: string[] = [];
  const m = html.match(/<!--gen:data--><script type="application\/json" id="dg-data">([\s\S]*?)<\/script><!--\/gen:data-->/);
  if (!m) return ['no embedded data'];
  const data = JSON.parse(m[1]) as { counts: Record<string, number>; items: { key: string; b: boolean; s3: boolean; by: string | null }[] };
  // independent of the renderer: the page's lists against a fresh ledger run
  const rem = new Set(data.items.filter(i => i.s3).map(i => i.key)), all = new Set(data.items.map(i => i.key));
  const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(k => b.has(k));
  if (!same(all, D.setB)) errs.push(`the page's prescriptions on today's model differ from the ledger (${all.size} vs ${D.setB.size})`);
  if (!same(rem, D.set3)) errs.push(`the page's remaining prescriptions on S3 differ from the ledger (${rem.size} vs ${D.set3.size})`);
  if (data.counts.B !== D.B.count.total || data.counts.S3 !== D.L3.count.total) errs.push('the page\'s headline counts differ from the ledger');
  for (const l of LAYERS) if (data.counts[l.key] !== D.layerEffect[l.key].total) errs.push(`the page's count with ${l.key} differs from the ledger`);
  for (const i of data.items) if (!i.s3 && !i.by) errs.push(`${i.key}: replaced without a switch`);
  for (const h of html.matchAll(/href="([^"#:]+)(#[^"]*)?"/g)) if (!existsSync(join(ROOT, 'docs', h[1]))) errs.push(`broken link ${h[1]}`);
  for (const h of html.matchAll(/href="#([^"]+)"/g)) if (!html.includes(`id="${h[1]}"`)) errs.push(`broken anchor #${h[1]}`);
  for (const u of html.matchAll(/<use[^>]*href="#([^"]+)"/g)) if (!html.includes(`id="${u[1]}"`)) errs.push(`missing symbol #${u[1]}`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(x => x[1]), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) errs.push(`duplicate ids: ${[...new Set(dup)].slice(0, 8).join(', ')}`);
  return errs;
}

function main() {
  const check = process.argv.includes('--check');
  const D = buildData();
  const errs = checkContent(D);
  if (errs.length) { console.error(errs.map(e => `  - ${e}`).join('\n')); fail(`${errs.length} content error(s)`); }
  const html = readFileSync(PAGE, 'utf8');
  const stampCommit = (html.match(/<!--gen:stamp-->Generated from <code>([^<]+)<\/code>/) ?? [])[1];
  const commit = check && stampCommit ? stampCommit : execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  const out = render(D, html, commit);
  const pageErrs = checkPage(D, out);
  if (pageErrs.length) { console.error(pageErrs.map(e => `  - ${e}`).join('\n')); fail(`${pageErrs.length} page error(s)`); }
  const t3 = D.L3.count, tb = D.B.count;
  console.log(`today's model ${tb.total} (${tb.registryActive} + ${tb.literals} literals); S3 ${t3.total} (${t3.registryActive} + ${t3.literals}); replaced ${tb.total - t3.total}; ${LAYERS.map(l => `${l.key} ${D.layerEffect[l.key].total}`).join(', ')}`);
  if (check) {
    if (out !== html) { console.error('docs/decision-guide.html is out of date: run pnpm exec tsx scripts/decision-guide.ts'); process.exit(1); }
    console.log('docs/decision-guide.html is up to date and agrees with the ledger');
    return;
  }
  if (out !== html) { writeFileSync(PAGE, out); console.log('wrote docs/decision-guide.html'); } else console.log('docs/decision-guide.html unchanged');
}

main();
