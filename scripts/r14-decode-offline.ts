// Stage R14, a reading (docs/staging/r14-diag-decode.md): what the odds of stage R11's adapters say about decodes between
// the top pick and a plain draw, and where those odds hedge, on that stage's 1,500 held-out fresh draws (seed 21), whose
// label is the rules' own odds q. Read-only arithmetic on files already written: no model, no world, nothing registered.
//
//   reads   <dir>/eval/test.jsonl                the held-out rows with their label (scripts/r11-assemble.ts)
//           <dir>/eval/all.<adapter>.jsonl       an adapter's probabilities on the same rows (training/decide_ft/em_score.py)
//           <dir>/eval/all.jsonl                 the packets the adapters were sent
//           <dir>/parts/s21-*.jsonl              the sampler's records: every option's value without its jitter, the rules' reason, the context
//           <dir>/adapters/<adapter>/progress.json   the development loss per epoch (the only development-file figure on file)
//           docs/staging/r11-offline.md          the published table, to hold the recomputed figures against
//           data/params.json and the parameter file each part's meta names   the values of the rules' constants the text quotes
//   writes  --md (default artifacts/r14/tables/r14-decode-offline.md)
//
//   pnpm exec tsx scripts/r14-decode-offline.ts --dir <stage R11's artifacts/decide-ft/r11> [--adapters r11-p5b-s7,r11-p5b-s11] [--md docs/staging/r14-decode-offline.md]
//
// The adapters' answers on the development file are not on file (the trainer saved its loss only), and no model may be
// loaded here, so "pick on one set, read on another" is done inside the held-out draws: the animals are split in two
// halves by a hash of the animal, a transform is picked on one half and read on the other, never the same rows for both.
// Every model figure is a "rules-taught model on a rules menu".
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { auc, divergence, DRAW, FIT_TEMPERATURES, first, KINDS, kindOf, massOnDropped, mean, temperature, TOP, totalVariation, TRANSFORMS, unit, type Transform } from './lib/r14-decode';
import { seeded } from './lib/soft-labels';

/** A label is "clear" (the rules are near-certain) from this mass on one option (scripts/r11-offline.ts CLEAR). */
export const CLEAR = 0.99;
/** The model is "sure" of an option from this probability (the published "share at 0.9 or more"). */
export const SURE = 0.9;
const BOOT = 2000;

interface Row {
  id: string; seed: number; chimpId: number; hour: number; phase: string; why: string; label: string; rgIndex: number;
  soft?: Record<string, number>; options: { action: string; targetId: number; family: string }[];
  act: { action: string; targetId: number; seconds: number; finished: boolean; onMenu: boolean }; carryOn: number; tokens: Record<string, number>;
}
interface Part { raw: number[]; reason: string[]; social: { action: string; ageYears: number; distance: number }[]; sleepiness: number | null; party: number; light: number | null }
export interface Ask { r: Row; q: number[]; animal: string; half: 0 | 1; trip: number[]; top: number; clear: boolean; nest: boolean; part: Part | null; state: Record<string, unknown> | null }

/** The six readouts of one transform over a set of asks, and the two companions of the divergence. */
export interface Readouts { n: number; divergence: number; dropped: number; tv: number; trip: number; carry: number; leave: number; leaveNest: number; disagree: number }
export const READOUTS = ['divergence', 'trip', 'carry', 'leave', 'leaveNest', 'disagree'] as const;
export type Readout = (typeof READOUTS)[number];
export const READOUT_NAME: Record<Readout, string> = { divergence: 'divergence', trip: 'trip rate', carry: 'carrying on', leave: 'leaving where the rules are sure', leaveNest: 'leaving a nest at dusk or night', disagree: 'disagreement with the rules\' pick' };

/** The readouts of the distribution `of(ask)` over `asks`. */
export function readouts(asks: Ask[], of: (a: Ask) => number[]): Readouts {
  const d: number[] = [], dr: number[] = [], tv: number[] = [], trip: number[] = [], carry: number[] = [], leave: number[] = [], nest: number[] = [], dis: number[] = [];
  for (const a of asks) {
    const p = of(a);
    d.push(divergence(a.q, p)); dr.push(massOnDropped(a.q, p)); tv.push(totalVariation(a.q, p)); dis.push(1 - p[a.r.rgIndex]);
    if ((a.r.phase === 'day' || a.r.phase === 'dawn') && a.trip.length) trip.push(a.trip.reduce((s, i) => s + p[i], 0));
    if (a.r.carryOn >= 0) carry.push(p[a.r.carryOn]);
    if (a.clear) { leave.push(1 - p[a.top]); if (a.nest) nest.push(1 - p[a.top]); }
  }
  return { n: asks.length, divergence: mean(d), dropped: mean(dr), tv: mean(tv), trip: mean(trip), carry: mean(carry), leave: mean(leave), leaveNest: mean(nest), disagree: mean(dis) };
}
/** How far a transform's readout lies from the rules' own value (the divergence is already a distance). */
export const distance = (x: Readouts, rules: Readouts, k: Readout): number => (k === 'divergence' ? x.divergence : Math.abs(x[k] - rules[k]));
/** The readouts on which `x` lies strictly nearer the rules than both the top pick and the plain draw. */
export function nearerThanBoth(x: Readouts, top: Readouts, draw: Readouts, rules: Readouts): Readout[] {
  return READOUTS.filter(k => distance(x, rules, k) < Math.min(distance(top, rules, k), distance(draw, rules, k)) - 1e-12);
}
/** The readouts on which `x` lies further from the rules than both. */
export function furtherThanBoth(x: Readouts, top: Readouts, draw: Readouts, rules: Readouts): Readout[] {
  return READOUTS.filter(k => distance(x, rules, k) > Math.max(distance(top, rules, k), distance(draw, rules, k)) + 1e-12);
}

/** Mean and 95% bootstrap interval over animals of per-ask values (the method of scripts/r11-offline.ts boot). */
export function boot(values: { key: string; v: number }[], tag: string): { mean: number; lo: number; hi: number } {
  const by = new Map<string, { s: number; n: number }>();
  for (const x of values) { const g = by.get(x.key) ?? { s: 0, n: 0 }; g.s += x.v; g.n++; by.set(x.key, g); }
  const groups = [...by.values()], rnd = seeded(`r14-boot:${tag}`), stats: number[] = [];
  if (!groups.length) return { mean: NaN, lo: NaN, hi: NaN };
  for (let b = 0; b < BOOT; b++) { let s = 0, n = 0; for (let k = 0; k < groups.length; k++) { const g = groups[Math.floor(rnd() * groups.length)]; s += g.s; n += g.n; } stats.push(s / n); }
  stats.sort((a, b) => a - b);
  return { mean: mean(values.map(x => x.v)), lo: stats[Math.floor(0.025 * BOOT)], hi: stats[Math.ceil(0.975 * BOOT) - 1] };
}
/** Which half an animal falls in: a hash of the animal, nothing else. */
export const halfOf = (animal: string): 0 | 1 => (seeded(`r14-half:${animal}`)() < 0.5 ? 0 : 1);
/** The temperature of `grid` with the lowest mean divergence over `asks` (the first one on a tie). */
export function fitTemperature(asks: Ask[], p: (a: Ask) => number[], grid: number[] = FIT_TEMPERATURES): { T: number; divergence: number } {
  let best = { T: NaN, divergence: Infinity };
  for (const T of grid) { const d = mean(asks.map(a => divergence(a.q, temperature(p(a), T)))); if (d < best.divergence - 1e-12) best = { T, divergence: d }; }
  return best;
}
/** A rules' reason sentence without its names and numbers: the words up to the first name, species or figure (at most ten). */
export function reasonClass(reason: string): string {
  const words = reason.split(/\s+/), out: string[] = [];
  for (let i = 0; i < words.length && out.length < 10; i++) { if (i > 0 && !/^[a-z]/.test(words[i])) break; out.push(words[i]); }
  return out.join(' ').replace(/[;,]$/, '');
}

if (process.argv[1]?.endsWith('r14-decode-offline.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('dir', 'artifacts/decide-ft/r11')), md = arg('md', 'artifacts/r14/tables/r14-decode-offline.md'), adapters = arg('adapters', 'r11-p5b-s7,r11-p5b-s11').split(',').filter(Boolean);
  const published = arg('published', 'docs/staging/r11-offline.md');
  const lines = <T>(file: string): T[] => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as T);

  // ---------------------------------------------------------------------------------------------------------------------
  // the held-out fresh draws, their label, the sampler's record and the packet
  // ---------------------------------------------------------------------------------------------------------------------
  const fresh = lines<Row>(`${dir}/eval/test.jsonl`).filter(r => r.label === 'fresh' && r.soft), want = new Set(fresh.map(r => r.id));
  const parts = new Map<string, Part>();
  for (const f of ['s21-W25', 's21-W50']) {
    const seen = new Map<string, number>();
    for (const l of readFileSync(`${dir}/parts/${f}.jsonl`, 'utf8').split('\n')) {
      if (!l) continue;
      const head = l.slice(0, 60).match(/"id":"([^"]+)"/);   // the id first: a record is parsed only when it is a held-out row
      if (!head) throw new Error(`${f}: a record without an id at its start`);
      const k = (seen.get(head[1]) ?? 0) + 1; seen.set(head[1], k);
      const id = k === 1 ? head[1] : `${head[1]}~${k}`;   // scripts/r11-assemble.ts uniqueIds, per part, in file order
      if (!want.has(id)) continue;
      const rec = JSON.parse(l) as { rgIndex: number; options: { action: string; targetId: number; raw: number }[]; lab?: { raw: number[] }; context: { candidates: { reason: string }[]; social: { action: string; ageYears: number; distance: number }[]; body?: { sleepiness?: number }; environment: { partySize: number }; light?: { level: number } } };
      parts.set(id, { raw: rec.lab ? rec.lab.raw : rec.options.map(o => o.raw), reason: rec.context.candidates.map(c => c.reason), social: rec.context.social.map(s => ({ action: s.action, ageYears: s.ageYears, distance: s.distance })), sleepiness: rec.context.body?.sleepiness ?? null, party: rec.context.environment.partySize, light: rec.context.light?.level ?? null });
      const row = fresh.find(r => r.id === id)!;
      if (row.rgIndex !== rec.rgIndex || row.options.length !== rec.options.length || row.options.some((o, i) => o.action !== rec.options[i].action || o.targetId !== rec.options[i].targetId)) throw new Error(`${id}: the sampler's record is not the held-out row`);
    }
  }
  const states = new Map<string, Record<string, unknown>>();
  for (const l of readFileSync(`${dir}/eval/all.jsonl`, 'utf8').split('\n')) {
    if (!l) continue;
    const head = l.slice(0, 60).match(/"id":"([^"]+)"/);
    if (!head || !want.has(head[1])) continue;
    const row = JSON.parse(l) as { id: string; packets: Record<string, { state: Record<string, unknown> }> };
    if (row.packets.p5b) states.set(row.id, row.packets.p5b.state);
  }
  const asks: Ask[] = fresh.map(r => {
    const q = r.options.map((_, i) => r.soft![`c${i}`]), top = first(q), animal = `${r.seed}:${r.chimpId}`, clear = q[top] >= CLEAR;
    return { r, q, animal, half: halfOf(animal), trip: r.options.map((o, i) => (o.family === 'food-trip' ? i : -1)).filter(i => i >= 0), top, clear,
      nest: clear && (r.phase === 'dusk' || r.phase === 'night') && r.options[top].family === 'nest', part: parts.get(r.id) ?? null, state: states.get(r.id) ?? null };
  });
  if (asks.some(a => !a.part)) throw new Error(`${asks.filter(a => !a.part).length} held-out fresh draws have no sampler's record`);
  const probs = new Map<string, Map<string, number[]>>();
  for (const name of adapters) {
    const arm = /p5a/.test(name) ? 'p5a' : 'p5b', m = new Map<string, number[]>();
    for (const s of lines<{ id: string; packet: string; probs: number[] }>(`${dir}/eval/all.${name}.jsonl`)) if (s.packet === arm && want.has(s.id)) m.set(s.id, s.probs);
    for (const a of asks) { const p = m.get(a.r.id); if (!p || p.length !== a.q.length) throw new Error(`${name}: no answer of ${a.q.length} probabilities for ${a.r.id}`); }
    probs.set(name, m);
  }
  const pOf = (name: string) => (a: Ask) => probs.get(name)!.get(a.r.id)!;
  // the rules' constants the text quotes, as the held-out worlds ran them: the registry's value unless the world's parameter file sets another
  const registry = new Map((JSON.parse(readFileSync(resolve('data/params.json'), 'utf8')) as { params: { id: string; value: number }[] }).params.map(e => [e.id, e.value]));
  const bases = ['s21-W25', 's21-W50'].map(f => JSON.parse(readFileSync(resolve((JSON.parse(readFileSync(`${dir}/parts/${f}.meta.json`, 'utf8')) as { paramsFile: string }).paramsFile), 'utf8')) as Record<string, number>);
  const param = (id: string): number => { const v = bases.map(b => b[id] ?? registry.get(id)); if (v.some(x => x === undefined || x !== v[0])) throw new Error(`the held-out worlds do not share one value of ${id}`); return v[0]!; };
  const SPAN = param('candidateJitterSpan');
  const rulesOwn = (set: Ask[]) => readouts(set, a => a.q);

  const L: string[] = [], p = (s = '') => L.push(s);
  const f = (v: number | null | undefined, d = 3) => (v === null || v === undefined || !Number.isFinite(v) ? 'none' : v.toFixed(d)), n = (v: number) => Math.round(v).toLocaleString('en-US');
  const ci = (b: { mean: number; lo: number; hi: number }, d = 3) => `${f(b.mean, d)} (${f(b.lo, d)} to ${f(b.hi, d)})`;
  const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
  const table = (head: string[], rows: (string | number)[][]) => { p(`| ${head.join(' | ')} |`); p(`| ${head.map(() => '---').join(' | ')} |`); for (const r of rows) p(`| ${r.join(' | ')} |`); };
  const share = (a: unknown[], of: unknown[]) => (of.length ? a.length / of.length : NaN);

  p('# Stage R14 reading: decodes between the top pick and a plain draw, offline (numbers)');
  p();
  p(`Generated by \`scripts/r14-decode-offline.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from stage R11's held-out file and the score files of ${adapters.join(', ')}. No number here is typed. Document: [r14-diag-decode.md](r14-diag-decode.md).`);
  p();
  p('**A description of finished records. It registers nothing and proposes no setting.** Every model figure is a "rules-taught model on a rules menu": the teacher is the rules, the label q is the rules\' own odds on the rules\' menu, and nearness to it says nothing about wild chimpanzees. No world is run and no model is loaded: this is arithmetic on odds already on file.');
  p();
  const A = asks.filter(a => a.half === 0), B = asks.filter(a => a.half === 1), animals = (s: Ask[]) => new Set(s.map(a => a.animal)).size;
  p(`Held-out fresh draws with a label: ${n(asks.length)} of ${animals(asks)} animals. The rules put ${CLEAR} or more on one option at ${n(asks.filter(a => a.clear).length)} of them; ${n(asks.filter(a => a.nest).length)} of those are a nest at dusk or night. Day and dawn draws with a trip to food on the menu: ${n(asks.filter(a => (a.r.phase === 'day' || a.r.phase === 'dawn') && a.trip.length).length)}; draws on which the act in progress can be carried on: ${n(asks.filter(a => a.r.carryOn >= 0).length)}.`);
  p();
  p(`**The two halves.** The adapters' answers on the development file were never saved (the trainer wrote its loss per epoch only) and no model may be loaded here. So a transform is picked on one half of the held-out animals and read on the other, by a hash of the animal: half A ${n(A.length)} draws of ${animals(A)} animals, half B ${n(B.length)} draws of ${animals(B)} animals. No row is used for both.`);

  // ---------------------------------------------------------------------------------------------------------------------
  // 0. the published figures, reproduced
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 0. The published figures, recomputed');
  p();
  const pubText = existsSync(resolve(published)) ? readFileSync(resolve(published), 'utf8') : '', pubSections = pubText.split(/\n## /);
  /** The cells of an adapter's first row in a section of the published table (by the section's number). */
  const pubRow = (section: number, name: string): string[] | null => { const s = pubSections.find(x => x.startsWith(`${section}. `)); const row = s?.split('\n').find(l => l.startsWith(`| ${name} |`)); return row ? row.split('|').map(c => c.trim()) : null; };
  const lead = (cell: string | undefined) => (cell === undefined ? NaN : parseFloat(cell));
  p(`Against \`${published}\` (stage R11's generated table). "Same" when the two agree to the three decimals printed.`);
  p();
  const rows0: (string | number)[][] = [];
  let allSame = true;
  for (const name of adapters) {
    const P = pOf(name), carry = asks.filter(a => a.r.carryOn >= 0), tripRows = asks.filter(a => (a.r.phase === 'day' || a.r.phase === 'dawn') && a.trip.length), clear = asks.filter(a => a.clear), nest = asks.filter(a => a.nest);
    const on = (a: Ask) => a.trip.reduce((s, i) => s + P(a)[i], 0);
    const mine: [string, number, number][] = [
      ['divergence from the rules\' distribution', mean(asks.map(a => divergence(a.q, P(a)))), lead(pubRow(1, name)?.[5])],
      ['top-1, the rules\' pick', mean(asks.map(a => +(first(P(a)) === a.r.rgIndex))), lead(pubRow(1, name)?.[6])],
      ['top-1, the label\'s top', mean(asks.map(a => +(first(P(a)) === a.top))), lead(pubRow(1, name)?.[7])],
      ['mean probability on the trip', mean(tripRows.map(on)), lead(pubRow(2, name)?.[2])],
      ['top pick is the trip', mean(tripRows.map(a => +a.trip.includes(first(P(a))))), lead(pubRow(2, name)?.[4])],
      ['probability on carrying on', mean(carry.map(a => P(a)[a.r.carryOn])), lead(pubRow(6, name)?.[2])],
      ['carrying on: share at 0.9 or more', mean(carry.map(a => +(P(a)[a.r.carryOn] >= SURE))), lead(pubRow(6, name)?.[5])],
      ['where the rules are sure: mean probability on their option', mean(clear.map(a => P(a)[a.top])), lead(pubRow(11, name)?.[2])],
      ['where the rules are sure: share at 0.9 or more', mean(clear.map(a => +(P(a)[a.top] >= SURE))), lead(pubRow(11, name)?.[3])],
      ['where the rules are sure: the top pick is it', mean(clear.map(a => +(first(P(a)) === a.top))), lead(pubRow(11, name)?.[4])],
      ['a nest at dusk or night: mean probability on it', mean(nest.map(a => P(a)[a.top])), lead(pubRow(11, name)?.[5])],
      ['a nest at dusk or night: a draw leaves it', 1 - mean(nest.map(a => P(a)[a.top])), lead(pubRow(11, name)?.[7])],
    ];
    for (const [what, v, pub] of mine) { const same = Number.isFinite(pub) && f(v) === f(pub); if (!same) allSame = false; rows0.push([name, what, f(pub), f(v), same ? 'same' : '**differs**']); }
  }
  table(['Adapter', 'Readout', 'Published', 'Recomputed here', ''], rows0);
  p();
  const R = rulesOwn(asks);
  p(`All ${rows0.length} figures ${allSame ? 'are the published ones' : '**are not all the published ones**'}. The rules' own side, from the label: a trip on ${f(R.trip)} of trip menus, carrying on at ${f(R.carry)}, the label's top option left at ${f(R.leave)} of the draws where it holds ${CLEAR} or more (${f(R.leaveNest)} for a nest at dusk or night), and a second draw of the rules' own odds disagreeing with the option the rules took at ${f(R.disagree)} of draws (the label's top option is the one taken at ${f(mean(asks.map(a => +(a.top === a.r.rgIndex))))}).`);

  // ---------------------------------------------------------------------------------------------------------------------
  // 1. the family against the rules' odds
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 1. The family of transforms against the rules\' odds (all held-out draws)');
  p();
  p(`Each transform turns the adapter's odds p into the odds p' one draw would be taken from. Per column: the **divergence** KL(q || p') in nats, with p' floored at 1e-9 as the published figure is (a transform that gives probability 0 to an option the rules sometimes take pays 20.7 nats per unit of the rules' mass there, so "the rules' mass on dropped options" and the bounded **total variation** are printed beside it); the expected **trip rate** on day and dawn menus with a trip; the expected rate of **carrying on**; how often one draw **leaves the rules' option** where the rules put ${CLEAR} or more on it, on all such draws and on nests at dusk or night; and the expected **disagreement** with the option the rules took. "Nearer than both" counts the six readouts (divergence, trip rate, carrying on, the two leaving rates, disagreement) on which the transform lies strictly nearer the rules' own value than the top pick and than the plain draw; "further than both" those on which it lies further than both.`);
  const perAdapter = new Map<string, Map<string, Readouts>>();
  for (const name of adapters) {
    const P = pOf(name), all = new Map<string, Readouts>();
    for (const t of TRANSFORMS) all.set(t.id, readouts(asks, a => t.apply(P(a))));
    perAdapter.set(name, all);
    const top = all.get(TOP.id)!, draw = all.get(DRAW.id)!;
    p();
    p(`### ${name}`);
    p();
    table(['Transform', 'Divergence', 'The rules\' mass on dropped options', 'Total variation', 'Trip rate', 'Carrying on', 'Leaves the rules\' option where they are sure', 'Leaves a nest at dusk or night', 'Disagrees with the rules\' pick', 'Nearer than both (of 6)', 'Further than both'],
      [['**the rules\' own odds**', f(0), f(0), f(0), f(R.trip), f(R.carry), f(R.leave), f(R.leaveNest), f(R.disagree), '', ''],
        ...TRANSFORMS.map(t => { const x = all.get(t.id)!, near = t === TOP || t === DRAW ? null : nearerThanBoth(x, top, draw, R), far = t === TOP || t === DRAW ? null : furtherThanBoth(x, top, draw, R);
          return [t.id, f(x.divergence), f(x.dropped), f(x.tv), f(x.trip), f(x.carry), f(x.leave), f(x.leaveNest), f(x.disagree), near ? `${near.length}${near.length ? `: ${near.map(k => READOUT_NAME[k]).join('; ')}` : ''}` : '', far ? (far.length ? far.map(k => READOUT_NAME[k]).join('; ') : 'none') : '']; })]);
    const winners = TRANSFORMS.filter(t => t !== TOP && t !== DRAW && nearerThanBoth(all.get(t.id)!, top, draw, R).length === READOUTS.length);
    p();
    p(`Transforms nearer the rules than both the top pick and the plain draw on every readout at once: **${winners.length ? winners.map(t => t.id).join(', ') : 'none'}**. The most readouts any transform wins against both: ${Math.max(...TRANSFORMS.filter(t => t !== TOP && t !== DRAW).map(t => nearerThanBoth(all.get(t.id)!, top, draw, R).length))} of ${READOUTS.length}.`);
  }

  // ---------------------------------------------------------------------------------------------------------------------
  // 2. picked on one half, read on the other
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 2. Picked on one half of the animals, read on the other');
  p();
  p('Per family, the setting with the lowest divergence on the picking half, and the one with the lowest total variation there (two rules fixed before any number was read; the first is the published agreement measure, the second does not blow up on a dropped option). Its six readouts are then read on the other half, beside the top pick and the plain draw on that same half. Both directions, both trainings.');
  const families = ['temperature', 'nucleus', 'threshold', 'floor'] as const;
  for (const name of adapters) {
    const P = pOf(name);
    p();
    p(`### ${name}`);
    p();
    const rows2: (string | number)[][] = [];
    for (const [pick, read, label] of [[A, B, 'A, read on B'], [B, A, 'B, read on A']] as [Ask[], Ask[], string][]) {
      const Rr = rulesOwn(read), top = readouts(read, a => TOP.apply(P(a))), draw = readouts(read, a => DRAW.apply(P(a)));
      const line = (who: string, rule: string, x: Readouts, near: string) => [label, who, rule, f(x.divergence), f(x.tv), f(x.trip), f(x.carry), f(x.leave), f(x.leaveNest), f(x.disagree), near];
      rows2.push(line('**the rules\' own odds**', '', Rr, ''), line(TOP.id, '', top, ''), line(DRAW.id, '', draw, ''));
      for (const fam of families) {
        const cand = TRANSFORMS.filter(t => t.family === fam), score = (t: Transform, k: 'divergence' | 'tv') => readouts(pick, a => t.apply(P(a)))[k];
        for (const k of ['divergence', 'tv'] as const) {
          const best = cand.reduce((b, t) => (score(t, k) < score(b, k) - 1e-12 ? t : b), cand[0]), x = readouts(read, a => best.apply(P(a))), near = nearerThanBoth(x, top, draw, Rr);
          rows2.push(line(best.id, k === 'divergence' ? 'lowest divergence' : 'lowest total variation', x, `${near.length}${near.length ? `: ${near.map(r => READOUT_NAME[r]).join('; ')}` : ''}`));
        }
      }
      const win = (set: Ask[]) => { const Rs = rulesOwn(set), t0 = readouts(set, a => TOP.apply(P(a))), d0 = readouts(set, a => DRAW.apply(P(a))); return TRANSFORMS.filter(t => t !== TOP && t !== DRAW && nearerThanBoth(readouts(set, a => t.apply(P(a))), t0, d0, Rs).length === READOUTS.length).map(t => t.id); };
      const wp = win(pick), wr = win(read);
      rows2.push([label, `nearer than both on all six: on the picking half ${wp.length ? wp.join(', ') : 'none'}; on the reading half ${wr.length ? wr.join(', ') : 'none'}`, '', '', '', '', '', '', '', '', '']);
    }
    table(['Picked on', 'Transform', 'Picked by', 'Divergence', 'Total variation', 'Trip rate', 'Carrying on', 'Leaves where the rules are sure', 'Leaves a nest at dusk or night', 'Disagrees with the rules\' pick', 'Nearer than both on the reading half (of 6)'], rows2);
  }

  // ---------------------------------------------------------------------------------------------------------------------
  // 3. one temperature, or several
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 3. Is one temperature enough to describe the gap?');
  p();
  p(`The temperature T (p' ∝ p^(1/T)) with the lowest divergence from the rules' odds, on a grid from ${FIT_TEMPERATURES[0]} to ${FIT_TEMPERATURES[FIT_TEMPERATURES.length - 1]} in steps of 0.05. Below 1: the adapter is too flat there and sharpening brings it nearer the rules. Above 1: it is too sharp there and flattening does. A group is read by what a decode could know (the time of day, the kind of the adapter's own top option, its top probability); the last block splits by the label itself, which no decode can see, and is there to show the shape of the gap.`);
  const groupings: [string, (a: Ask, P: (a: Ask) => number[]) => string, boolean][] = [
    ['time of day', a => a.r.phase, true],
    ['kind of the adapter\'s top option', (a, P) => kindOf(a.r.options[first(P(a))].family), true],
    ['the adapter\'s top option carries on the act in progress', (a, P) => (a.r.carryOn < 0 ? 'nothing to carry on' : first(P(a)) === a.r.carryOn ? 'yes' : 'no, another option'), true],
    ['the adapter\'s top probability', (a, P) => { const m = Math.max(...P(a)); return m < 0.5 ? 'under 0.5' : m < 0.8 ? '0.5 to 0.8' : m < 0.95 ? '0.8 to 0.95' : '0.95 or more'; }, true],
    ['the label (what no decode can see)', a => (a.clear ? `the rules put ${CLEAR} or more on one option` : Math.max(...a.q) >= 0.8 ? 'the rules\' top option holds 0.8 to 0.99' : 'the rules\' top option holds under 0.8'), false],
  ];
  for (const name of adapters) {
    const P = pOf(name), all = fitTemperature(asks, P), d1 = mean(asks.map(a => divergence(a.q, unit(P(a)))));
    p();
    p(`### ${name}`);
    p();
    p(`All draws: best temperature **${f(all.T, 2)}** (divergence ${f(all.divergence)} against ${f(d1)} as given). On half A alone ${f(fitTemperature(A, P).T, 2)}, on half B alone ${f(fitTemperature(B, P).T, 2)}.`);
    p();
    const rows3: (string | number)[][] = [];
    for (const [title, of] of groupings) {
      const keys = [...new Set(asks.map(a => of(a, P)))].sort((x, y) => asks.filter(a => of(a, P) === y).length - asks.filter(a => of(a, P) === x).length);
      for (const k of keys) {
        const g = asks.filter(a => of(a, P) === k);
        if (g.length < 20) { rows3.push([title, k, n(g.length), 'too few', '', '', '', '']); continue; }
        const fit = fitTemperature(g, P), gA = g.filter(a => a.half === 0), gB = g.filter(a => a.half === 1);
        rows3.push([title, k, n(g.length), f(fit.T, 2), gA.length >= 20 ? f(fitTemperature(gA, P).T, 2) : 'too few', gB.length >= 20 ? f(fitTemperature(gB, P).T, 2) : 'too few', f(mean(g.map(a => divergence(a.q, unit(P(a)))))), f(fit.divergence)]);
      }
    }
    table(['Grouped by', 'Group', 'Draws', 'Best temperature', 'On half A', 'On half B', 'Divergence as given', 'At its best temperature'], rows3);
    p();
    // out of sample: one temperature against one per group, picked on a half and read on the other
    const rows3b: (string | number)[][] = [];
    for (const [pick, read, label] of [[A, B, 'A, read on B'], [B, A, 'B, read on A']] as [Ask[], Ask[], string][]) {
      const as1 = read.map(a => ({ key: a.animal, id: a.r.id, v: divergence(a.q, unit(P(a))) })), one = fitTemperature(pick, P).T;
      const withT = (T: (a: Ask) => number) => read.map((a, i) => ({ key: a.animal, v: divergence(a.q, temperature(P(a), T(a))) - as1[i].v }));
      rows3b.push([label, `one temperature (${f(one, 2)})`, f(mean(as1.map(x => x.v))), ci(boot(withT(() => one), `${name}:${label}:one`))]);
      for (const [title, of, usable] of groupings) {
        if (!usable) continue;
        const Ts = new Map<string, number>();
        for (const k of new Set(pick.map(a => of(a, P)))) { const g = pick.filter(a => of(a, P) === k); Ts.set(k, g.length >= 20 ? fitTemperature(g, P).T : one); }
        rows3b.push([label, `one per group: ${title} (${[...Ts].map(([k, T]) => `${k} ${f(T, 2)}`).join('; ')})`, f(mean(as1.map(x => x.v))), ci(boot(withT(a => Ts.get(of(a, P)) ?? one), `${name}:${label}:${title}`))]);
      }
    }
    p('Read out of sample: the temperatures are fitted on one half and the change in the divergence is read on the other (paired per draw, 95% bootstrap over animals; below 0 is nearer the rules).');
    p();
    table(['Fitted on', 'Temperatures', 'Divergence as given, on the reading half', 'Change with the fitted temperatures'], rows3b);
  }

  // ---------------------------------------------------------------------------------------------------------------------
  // 4. reliability
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 4. Reliability: the adapter\'s probability against the rules\' odds');
  p();
  p(`**The top probability.** Per band of the adapter's top probability: its mean, the rules' own odds on that same option (the mean of q there: what "accuracy" is with the noise of the single pick averaged out), how often the rules took it, and how the rules' odds on it are spread inside the band: near 1, near 0, or between. A band whose mean matches is calibrated; a band that is calibrated and made of draws where the rules hold either nearly 1 or nearly 0 is one where the adapter does not tell the two apart, which no reshaping of its odds can do for it.`);
  const BANDS = [0, 0.4, 0.6, 0.8, 0.9, 0.95, 0.99, 1.0000001];
  for (const name of adapters) {
    const P = pOf(name);
    p();
    p(`### ${name}`);
    p();
    const rows4: (string | number)[][] = [];
    let ece = 0;
    for (let i = 0; i + 1 < BANDS.length; i++) {
      const g = asks.filter(a => { const m = Math.max(...P(a)); return m >= BANDS[i] && m < BANDS[i + 1]; });
      if (!g.length) continue;
      const conf = mean(g.map(a => Math.max(...P(a)))), qOn = g.map(a => a.q[first(P(a))]), acc = mean(g.map(a => +(first(P(a)) === a.r.rgIndex)));
      ece += g.length / asks.length * Math.abs(conf - mean(qOn));
      rows4.push([`${BANDS[i].toFixed(2)} to ${Math.min(1, BANDS[i + 1]).toFixed(2)}`, n(g.length), f(conf), f(mean(qOn)), f(acc), f(mean(qOn.map(v => +(v >= CLEAR)))), f(mean(qOn.map(v => +(v > 0.01 && v < CLEAR)))), f(mean(qOn.map(v => +(v <= 0.01))))]);
    }
    table(['The adapter\'s top probability', 'Draws', 'Its mean', 'The rules\' odds on that option', 'The rules took it', 'Share where the rules hold 0.99 or more on it', 'Between', 'Share where the rules hold 0.01 or less on it'], rows4);
    p();
    p(`Calibration error of the top probability against the rules' odds (the mean absolute gap, weighted by band): ${f(ece)}.`);
    p();
    // by kind of option, every option of every menu pooled
    type Opt = { a: Ask; i: number; p: number; q: number };
    const opts: Opt[] = asks.flatMap(a => a.q.map((q, i) => ({ a, i, p: P(a)[i], q })));
    const kindRow = (label: string, o: Opt[]): (string | number)[] => {
      const sureRules = o.filter(x => x.q >= CLEAR), sureModel = o.filter(x => x.p >= SURE), never = o.filter(x => x.q <= 0.01), mid = o.filter(x => x.p >= 0.2 && x.p < 0.8);
      return [label, n(o.length), f(mean(o.map(x => x.p))), f(mean(o.map(x => x.q))), `${f(mean(sureRules.map(x => x.p)))} (${n(sureRules.length)})`, `${f(mean(sureRules.map(x => +(x.p >= SURE))))}`, `${f(mean(sureModel.map(x => x.q)))} (${n(sureModel.length)})`, `${f(mean(never.map(x => x.p)))} (${n(never.length)})`,
        `${f(mean(mid.map(x => x.p)))} / ${f(mean(mid.map(x => x.q)))} (${n(mid.length)})`, `${f(mean(mid.map(x => +(x.q >= CLEAR || x.q <= 0.01))))}`, f(auc(o.map(x => x.p), o.map(x => +(x.q >= 0.5))))];
    };
    p('**Per kind of option** (every option of every menu, pooled). "Where the rules are sure": options the rules give 0.99 or more. "Where the adapter is sure": options it gives 0.9 or more. "Never taken": options the rules give 0.01 or less. "In the middle": options the adapter gives 0.2 to 0.8, its mean against the rules\' mean there, and the share of them on which the rules are in fact at 0.99 or more or at 0.01 or less. The last column is how well the adapter\'s probability ranks the options the rules favour (0.5 or more) above the others (1 is perfect, 0.5 is chance).');
    p();
    const rowsK: (string | number)[][] = [kindRow('**carrying on the act in progress**', opts.filter(x => x.a.r.carryOn === x.i))];
    for (const k of KINDS) rowsK.push(kindRow(k, opts.filter(x => kindOf(x.a.r.options[x.i].family) === k)));
    for (const k of KINDS) { const o = opts.filter(x => x.a.r.carryOn === x.i && kindOf(x.a.r.options[x.i].family) === k); if (o.length >= 20) rowsK.push(kindRow(`carrying on: ${k}`, o)); }
    table(['Kind of option', 'Options', 'Mean probability', 'The rules\' mean odds', 'Where the rules are sure: the adapter\'s mean (n)', 'Share of those at 0.9 or more', 'Where the adapter is sure: the rules\' mean (n)', 'Never taken: the adapter\'s mean (n)', 'In the middle: adapter / rules (n)', 'Share of the middle where the rules are at 0.99 or more or 0.01 or less', 'Ranking (area under the curve)'], rowsK);
    p();
    // by time of day
    const rowsT: (string | number)[][] = [];
    for (const ph of ['dawn', 'day', 'dusk', 'night']) {
      const g = asks.filter(a => a.r.phase === ph); if (!g.length) continue;
      const cl = g.filter(a => a.clear), conf = g.filter(a => Math.max(...P(a)) >= SURE);
      rowsT.push([ph, n(g.length), f(mean(g.map(a => Math.max(...P(a))))), f(mean(g.map(a => Math.max(...a.q)))), f(mean(g.map(a => a.q[first(P(a))]))), f(mean(g.map(a => divergence(a.q, unit(P(a)))))), `${f(mean(cl.map(a => P(a)[a.top])))} (${n(cl.length)})`, `${f(mean(conf.map(a => a.q[first(P(a))])))} (${n(conf.length)})`]);
    }
    p('**By time of day.**');
    p();
    table(['Time of day', 'Draws', 'The adapter\'s mean top probability', 'The rules\' mean top odds', 'The rules\' odds on the adapter\'s top option', 'Divergence', 'Where the rules are sure: the adapter\'s mean on their option (n)', 'Where the adapter is sure (0.9 or more): the rules\' odds on its option (n)'], rowsT);
  }

  // ---------------------------------------------------------------------------------------------------------------------
  // 5. where the rules are sure and the adapter is not
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 5. Where the rules are sure and the adapter is not');
  p();
  const clear = asks.filter(a => a.clear), P0 = pOf(adapters[0]), hedged = (P: (a: Ask) => number[]) => (a: Ask) => P(a)[a.top] < SURE;
  p(`The ${n(clear.length)} held-out draws on which the rules put ${CLEAR} or more on one option. "Hedged": the adapter gives that option under ${SURE}. Per adapter: ${adapters.map(name => `${name} hedges on ${n(clear.filter(hedged(pOf(name))).length)} (${f(share(clear.filter(hedged(pOf(name))), clear))}), its mean probability on the rules' option ${f(mean(clear.map(a => pOf(name)(a)[a.top])))}`).join('; ')}.`);
  if (adapters.length >= 2) {
    const P1 = pOf(adapters[1]), x = clear.map(a => P0(a)[a.top]), y = clear.map(a => P1(a)[a.top]), mx = mean(x), my = mean(y);
    const r = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0) * y.reduce((s, v) => s + (v - my) ** 2, 0));
    const both = clear.filter(a => hedged(P0)(a) && hedged(P1)(a)).length, neither = clear.filter(a => !hedged(P0)(a) && !hedged(P1)(a)).length;
    p();
    p(`**Are they the same draws in both trainings?** Hedged by both ${n(both)}, by neither ${n(neither)}, by one only ${n(clear.length - both - neither)}; if the two trainings hedged independently at their own rates, both would hedge on ${n(share(clear.filter(hedged(P0)), clear) * share(clear.filter(hedged(P1)), clear) * clear.length)}. Correlation of the two adapters' probabilities on the rules' option across these draws: ${f(r, 2)}.`);
  }
  const split = (title: string, of: (a: Ask) => string, minN = 8, order?: string[]) => {
    const keys = [...new Set(clear.map(of))], count = (k: string) => clear.filter(a => of(a) === k).length;
    keys.sort((x, y) => (order ? order.indexOf(x) - order.indexOf(y) : count(y) - count(x)));
    const rows: (string | number)[][] = [], small: Ask[] = [];
    const line = (k: string, g: Ask[]) => [k, n(g.length), ...adapters.flatMap(name => [f(mean(g.map(a => pOf(name)(a)[a.top]))), f(share(g.filter(hedged(pOf(name))), g))]), f(share(g.filter(a => first(P0(a)) !== a.top), g))];
    for (const k of keys) { const g = clear.filter(a => of(a) === k); if (g.length < minN) small.push(...g); else rows.push(line(k, g)); }
    if (small.length) rows.push(line(`(groups under ${minN} draws, pooled)`, small));
    p();
    p(`**${title}**`);
    p();
    table(['', 'Draws where the rules are sure', ...adapters.flatMap(name => [`${name}: mean probability on the rules' option`, 'share hedged']), `${adapters[0]}: its top pick is another option`], rows);
  };
  split('By the kind of the rules\' option', a => kindOf(a.r.options[a.top].family), 1, [...KINDS]);
  split('By whether the rules\' option carries on the act in progress', a => (a.r.carryOn === a.top ? 'it carries on the act in progress' : a.r.carryOn >= 0 ? 'another option would carry on; the rules leave the act' : 'nothing to carry on (the act ended or is not on the menu)'), 1);
  split('By the reason for the ask', a => a.r.why, 1);
  split('By time of day', a => a.r.phase, 1, ['dawn', 'day', 'dusk', 'night']);
  split('By the hour', a => { const h = a.r.hour; return h < 5.5 ? 'before 05:30' : h < 6.5 ? '05:30 to 06:30' : h < 7.5 ? '06:30 to 07:30' : h < 10 ? '07:30 to 10:00' : h < 14 ? '10:00 to 14:00' : h < 18 ? '14:00 to 18:00' : h < 19.25 ? '18:00 to 19:15' : 'after 19:15'; }, 1, ['before 05:30', '05:30 to 06:30', '06:30 to 07:30', '07:30 to 10:00', '10:00 to 14:00', '14:00 to 18:00', '18:00 to 19:15', 'after 19:15']);
  split('By the size of the menu', a => `${a.r.options.length} options`, 1, [3, 4, 5, 6, 7, 8].map(k => `${k} options`));
  const margin = (a: Ask) => a.part!.raw[a.top] - Math.max(...a.part!.raw.filter((_, i) => i !== a.top));
  const MARGINS = [`under 1 span (${f(SPAN, 2)})`, '1 to 1.5 spans', '1.5 to 2.5 spans', '2.5 spans to 1', '1 or more'];
  split(`By the rules' margin: the value of their option less the best other option's, without the jitter. The jitter of an option spans ${f(SPAN, 2)} (\`candidateJitterSpan\`), so two options further apart than one span cannot swap; the continuation bonus of the act in progress is ${f(param('continueBonus'), 2)} (\`continueBonus\`)`, a => { const m = margin(a); return m < SPAN ? MARGINS[0] : m < 1.5 * SPAN ? MARGINS[1] : m < 2.5 * SPAN ? MARGINS[2] : m < 1 ? MARGINS[3] : MARGINS[4]; }, 1, MARGINS);
  split('By the rules\' own reason for their option (their sentence without names and figures; the adapters never see it)', a => reasonClass(a.part!.reason[a.top]), 8);
  // the packet's lines
  p();
  p(`**The packet's lines, hedged against not hedged** (${adapters[0]}). Share of the packets that carry each line, and three counts.`);
  p();
  const H = clear.filter(hedged(P0)), S = clear.filter(a => !hedged(P0)(a)), keysOf = [...new Set(clear.flatMap(a => Object.keys(a.state ?? {})))];
  const has = (g: Ask[], k: string) => f(share(g.filter(a => a.state && k in a.state), g));
  const cnt = (v: unknown) => (Array.isArray(v) ? v.length : v ? 1 : 0);
  table(['Line of the packet', `Hedged (${n(H.length)})`, `Not hedged (${n(S.length)})`], [
    ...keysOf.map(k => [`\`${k}\` present`, has(H, k), has(S, k)]),
    ['animals listed in `nearby`, mean', f(mean(H.map(a => cnt(a.state?.nearby))), 2), f(mean(S.map(a => cnt(a.state?.nearby))), 2)],
    ['options on the menu, mean', f(mean(H.map(a => a.q.length)), 2), f(mean(S.map(a => a.q.length)), 2)],
    ['estimated tokens, mean', f(mean(H.map(a => a.r.tokens.p5b)), 0), f(mean(S.map(a => a.r.tokens.p5b)), 0)],
    ['the rules\' margin, median', f([...H.map(margin)].sort((x, y) => x - y)[Math.floor(H.length / 2)], 2), f([...S.map(margin)].sort((x, y) => x - y)[Math.floor(S.length / 2)], 2)],
  ]);
  // the other side: where the adapter is sure and the rules are not
  p();
  p(`**The other side: where the adapter is sure and the rules are not.** Draws on which the adapter gives ${SURE} or more to an option the rules give under 0.5:`);
  p();
  table(['Adapter', 'Draws with 0.9 or more on one option', 'Of them, the rules give that option under 0.5', 'Under 0.01', 'What they are (time of day, the adapter\'s option, the rules\' top option)'], adapters.map(name => {
    const P = pOf(name), sure = asks.filter(a => Math.max(...P(a)) >= SURE), wrong = sure.filter(a => a.q[first(P(a))] < 0.5), tally = new Map<string, number>();
    for (const a of wrong) { const k = `${a.r.phase}: ${kindOf(a.r.options[first(P(a))].family)}${a.r.carryOn === first(P(a)) ? ' (carrying on)' : ''} where the rules ${kindOf(a.r.options[a.top].family)}`; tally.set(k, (tally.get(k) ?? 0) + 1); }
    return [name, n(sure.length), `${n(wrong.length)} (${f(share(wrong, sure))})`, n(sure.filter(a => a.q[first(P(a))] <= 0.01).length), [...tally].sort((x, y) => y[1] - x[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join('; ')];
  }));

  // ---------------------------------------------------------------------------------------------------------------------
  // 6. is what makes the rules sure in the packet? staying in the nest
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 6. Staying in the nest: what the rules value and what the packet lists');
  p();
  p(`Held-out fresh draws at which the animal is in its finished nest and staying is on the menu. On these worlds (\`rhythmCircadian\` ${param('rhythmCircadian')}, \`nestCompany\` ${param('nestCompany')}, \`choiceBelief\` ${param('choiceBelief')}, \`departRace\` ${param('departRace')}) the rules value staying at the rest score, plus ${f(param('rhythmSleepW'), 1)} times felt sleepiness (\`rhythmSleepW\`), plus the company of its best nest-mate of 12 years or more within the party link (${f(param('partyLinkM'), 0)} m, \`partyLinkM\`), who is "known without being seen" and who counts by day only if asleep (\`src/sim/candidates.ts\`, \`nestCompanyValue\` and the lines that call it), less a stake of delay. The packet lists the animals the animal perceives (\`nearby\`), calls any of them in a nest "in a nest" whether asleep or awake (\`src/kernel/packet-own.ts\`), and puts the animal's own sleepiness in words. Per time of day and by whether the packet\'s context lists a nest-mate of 12 or more in a nest: the value of staying without its jitter, the rules\' odds of staying and the adapter\'s. "Awake, no nest-mate listed, staying worth 0.6 or more": felt sleepiness under 0.1 in the context, no such animal listed, and yet a value of staying of 0.6 or more, where the rest score alone starts at 0.12 and gains 0.2 after a meal (\`src/sim/candidates.ts\`, \`restScore\`).`);
  p();
  const inNest = asks.filter(a => a.r.act.action === 'nest' && a.r.carryOn >= 0 && a.r.options[a.r.carryOn].action === 'nest');
  const mates = (a: Ask) => a.part!.social.filter(s => s.action === 'nest' && s.ageYears >= 12).length, stay = (a: Ask) => a.part!.raw[a.r.carryOn];
  const rows6: (string | number)[][] = [];
  for (const ph of ['dusk', 'night', 'dawn', 'day']) for (const [label, test] of [['a nest-mate of 12 or more is listed', (a: Ask) => mates(a) > 0], ['none is listed', (a: Ask) => mates(a) === 0]] as [string, (a: Ask) => boolean][]) {
    const g = inNest.filter(a => a.r.phase === ph && test(a)); if (!g.length) continue;
    const odd = g.filter(a => mates(a) === 0 && (a.part!.sleepiness ?? 1) < 0.1 && stay(a) >= 0.6);
    rows6.push([ph, label, n(g.length), `${f(mean(g.map(stay)), 2)} (${f(Math.min(...g.map(stay)), 2)} to ${f(Math.max(...g.map(stay)), 2)})`, f(mean(g.map(a => a.q[a.r.carryOn]))), ...adapters.map(name => f(mean(g.map(a => pOf(name)(a)[a.r.carryOn])))),
      label.startsWith('a nest-mate') ? '' : `${n(odd.length)}${odd.length ? `: the rules stay at ${f(mean(odd.map(a => a.q[a.r.carryOn])))}, ${adapters.map(name => `${name} ${f(mean(odd.map(a => pOf(name)(a)[a.r.carryOn])))}`).join(', ')}` : ''}`]);
  }
  table(['Time of day', 'In the packet\'s context', 'Draws', 'Value of staying, mean (range)', 'The rules\' odds of staying', ...adapters.map(name => `${name}: probability of staying`), 'Awake, no nest-mate listed, staying worth 0.6 or more'], rows6);
  p();
  p(`In all: ${n(inNest.length)} such draws, ${n(inNest.filter(a => a.r.phase === 'day').length)} of them in the day phase (${f(share(inNest.filter(a => a.r.phase === 'day'), asks))} of all held-out fresh draws): a rules-driven animal is rarely still in its nest by day, so a model taught on these files has seen few such moments.`);

  // ---------------------------------------------------------------------------------------------------------------------
  // 7. what the training records hold
  // ---------------------------------------------------------------------------------------------------------------------
  p();
  p('## 7. What the training records hold');
  p();
  const rows7: (string | number)[][] = [];
  for (const name of adapters) {
    const file = `${dir}/adapters/${name}/progress.json`;
    if (!existsSync(file)) continue;
    const prog = JSON.parse(readFileSync(file, 'utf8')) as { history: { epoch: number; n: number; acc: number; nll: number; label_entropy: number; train_loss: number }[] };
    for (const h of prog.history) rows7.push([name, h.epoch, f(h.train_loss, 4), f(h.nll, 4), f(h.nll - h.label_entropy, 4), f(h.acc, 4), n(h.n)]);
  }
  p('The trainer\'s own record per epoch (`progress.json` of each adapter): the mean training loss of the epoch, the loss on the development file (soft cross-entropy against the rules\' odds), that loss less the development labels\' own entropy (the divergence there), and the top-1 agreement. Three epochs were registered and run; the learning rate falls to 0 at the end of the third.');
  p();
  table(['Adapter', 'Epoch', 'Training loss', 'Development loss', 'Development divergence', 'Development top-1', 'Development rows'], rows7);
  // what the training file holds of the moments this reading turns on (labels only: no adapter's answer on these rows is on file)
  const trainFile = `${dir}/p5b/contexts/train.jsonl`;
  if (existsSync(trainFile)) {
    const train: { q: number[]; phase: string; stay: number }[] = [];
    for (const l of readFileSync(trainFile, 'utf8').split('\n')) {
      if (!l) continue;
      const cut = l.indexOf(',"packet":'), r = JSON.parse(cut > 0 ? `${l.slice(0, cut)}}` : l) as Row;   // the packet is the last field and is not needed here
      if (!r.soft) continue;
      train.push({ q: r.options.map((_, i) => r.soft![`c${i}`]), phase: r.phase, stay: r.act.action === 'nest' && r.carryOn >= 0 && r.options[r.carryOn].action === 'nest' ? r.carryOn : -1 });
    }
    const tn = train.filter(t => t.stay >= 0);
    p();
    p(`**The training file** (${n(train.length)} fresh draws of rules-driven worlds, labels only): the rules put ${CLEAR} or more on one option at ${n(train.filter(t => Math.max(...t.q) >= CLEAR).length)} of them (${f(share(train.filter(t => Math.max(...t.q) >= CLEAR), train))}; held out ${f(share(asks.filter(a => a.clear), asks))}). The animal is in its finished nest with staying on the menu at ${n(tn.length)}: ${['dawn', 'day', 'dusk', 'night'].map(ph => { const g = tn.filter(t => t.phase === ph); return `${ph} ${n(g.length)} (the rules stay at ${f(mean(g.map(t => t.q[t.stay])))})`; }).join(', ')}. So the day phase holds ${f(share(tn.filter(t => t.phase === 'day'), train))} of the training draws as moments in the nest.`);
  }

  mkdirSync(resolve(md, '..'), { recursive: true });
  writeFileSync(resolve(md), L.join('\n') + '\n');
  console.log(`wrote ${md}: ${adapters.length} adapter(s) on ${asks.length} held-out fresh draws`);
  for (const name of adapters) { const all = perAdapter.get(name)!; console.log(`${name}: divergence top ${f(all.get(TOP.id)!.divergence)} draw ${f(all.get(DRAW.id)!.divergence)}; leaves where the rules are sure top ${f(all.get(TOP.id)!.leave)} draw ${f(all.get(DRAW.id)!.leave)}`); }
}
