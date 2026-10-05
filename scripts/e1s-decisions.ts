// Stage E1s (docs/staging/e1s-prereg.md §8.5, the integrator's readouts for iteration 2): what animals aged 5 y or more
// choose at their decision points, by reserve band, read from checkpoint worlds of e-bench runs. Measurement only.
//   - crown options (a crown in view, an own or known-tree trip, a joined trip, a caller trip whose crown is known): the
//     spread of their values without the candidate jitter (range across crowns, best − second best), both as the
//     decision scores them (every term) and as their food term alone (candidates.ts treeFoodWorth: the crown's drive ×
//     the rate share, the walk and the climb in it);
//   - how often the candidate jitter (±candidateJitterSpan ÷ 2) reverses the crowns' value order (the best crown by value
//     is not the best by value + jitter), and how often the terms other than food (company for joined trips; territory,
//     core, rain for every crown) do (the best crown by value is not the best by food term);
//   - what is chosen (src/sim/decide.ts rulesTap, then the act after the tick): its kind, and for a trip its distance
//     (the share of chosen trips over 500 m).
// Each checkpoint world is continued for --hours (default 12) with the rules tap set (it reads only), so the decisions
// sampled are those of the run itself (the same code continues the same world deterministically). With --rows, ground km
// per animal-day by reserve band from the per-animal records of e-bench --animal-days parts (lean-season.ts byReserve).
//
//   pnpm exec tsx scripts/e1s-decisions.ts --ckpt LABEL=<a.v8.gz>[,<b.v8.gz>…] … [--rows LABEL=<part>[,<part>…] …] [--hours 12] [--out prefix]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { candidateMeta, treeFoodWorth, V } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { digestaCaps, ledgerOf, reserveCap } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { index, isTreeId, ix } from '../src/sim/state';
import { tickWorld } from '../src/simulation';
import type { Candidate, Chimp, Tree, World } from '../src/types';
import { readCheckpoint } from './lib/checkpoint';
import { byReserve, RESERVE_BINS } from './lib/lean-season';
import { decodeLossless } from './lib/lossless-json';

type Kind = 'view' | 'own' | 'joined' | 'caller';
interface Crown { kind: Kind; tree: number; d: number; raw: number; jit: number; food: number; action: string; target: number }
export interface Sample {
  band: number; male: boolean; fill: number; rel: number;
  crowns: Crown[]; fallbackRaw: number | null;
  /** The act chosen: its kind (a crown kind, 'fallback', or the action) and, for a crown, its distance. */
  chosen: string; chosenD: number | null; chosenRawBest: boolean | null; chosenFoodBest: boolean | null;
}

const bandOf = (rel: number): number => { for (let i = 0; i < RESERVE_BINS.length; i++) { const [hi, lo] = RESERVE_BINS[i]; if (rel <= hi && rel > lo) return i; } return rel > RESERVE_BINS[0][0] ? 0 : RESERVE_BINS.length - 1; };
const dxz = (a: { position: number[] }, b: { position: number[] }) => Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);

/** The crown options of a decision, with their food term (treeFoodWorth at the crop, feeders and distance the option was valued at). */
function crownsOf(w: World, c: Chimp, list: Candidate[]): { crowns: Crown[]; fallbackRaw: number | null } {
  const P = paramsOf(w), idx = index(w), x = ix(c), crowns: Crown[] = [];
  let fallbackRaw: number | null = null;
  for (const q of list) {
    const m = candidateMeta.get(q), raw = m?.raw ?? q.score, jit = m?.jit ?? 0;
    if (q.action === 'forage' && q.targetId === -1) { fallbackRaw = raw; continue; }
    let kind: Kind | null = null, t: Tree | undefined, crop = NaN, feeders = 0, d = NaN, share = 1;
    const bel = m?.bel;
    if (q.action === 'forage' && isTreeId(q.targetId)) {
      kind = 'view'; t = idx.treeById.get(q.targetId);
      if (t) { crop = fruitAt(w, t); d = dxz(t, c); for (const id of x.seen) { const o = idx.byId.get(id); if (o && o.action === 'forage' && o.targetId === t.id) feeders++; } }
    } else if (q.action === 'travel' && m && (m.v === V.TREE || m.v === V.CALLER)) {
      kind = m.v === V.CALLER ? 'caller' : m.aux > 0 ? 'joined' : 'own';
      const tid = bel ? bel[0] : m.v === V.TREE ? q.targetId : -1;
      t = isTreeId(tid) ? idx.treeById.get(tid) : undefined;
      if (t && bel) { crop = bel[1]; feeders = bel[3]; d = bel[4]; if (bel.length > 5 && Number.isFinite(bel[5])) share = bel[5]; }
      else if (t) {
        // in sight (no belief): the crop seen, the animals seen going or feeding there (destWorth's count)
        crop = fruitAt(w, t); d = dxz(t, c);
        for (const id of x.seen) { const o = idx.byId.get(id); if (o && o.alive && o !== c && o.targetId === t.id && (o.action === 'forage' || o.action === 'travel')) feeders++; }
        if (kind === 'caller') feeders = Math.max(feeders, 1);
      }
    }
    if (!kind) continue;
    const food = t && Number.isFinite(crop) ? treeFoodWorth(w, c, P, t, crop, feeders, d, share) : NaN;
    crowns.push({ kind, tree: t ? t.id : -1, d: Number.isFinite(d) ? d : NaN, raw, jit, food, action: q.action, target: q.targetId });
  }
  return { crowns, fallbackRaw };
}

const argmax = (a: Crown[], f: (k: Crown) => number): Crown | null => { let b: Crown | null = null; for (const k of a) if (!Number.isFinite(f(k))) continue; else if (!b || f(k) > f(b)) b = k; return b; };

/** Continues a checkpoint world for `hours`, sampling the rules decisions of animals aged 5 y or more. */
function sample(file: string, hours: number): { samples: Sample[]; animals: number; from: number } {
  return sampleWorld(readCheckpoint<{ world: World }>(file).state.world, hours);
}
/** Continues world `w` for `hours` (whole ticks) with the rules tap set, sampling decisions; the tap reads only. */
export function sampleWorld(w: World, hours: number): { samples: Sample[]; animals: number; from: number } {
  const P = paramsOf(w), samples: Sample[] = [];
  const pending = new Map<Chimp, Omit<Sample, 'chosen' | 'chosenD' | 'chosenRawBest' | 'chosenFoodBest'> & { list: Candidate[] }>();
  rulesTap.fn = (c, list, policy) => {
    if (!policy || !c.alive || c.age < 5) return;
    const L = ix(c).en; if (!L) return;
    const rel = L.res / reserveCap(c, P), [cap] = digestaCaps(c, P);
    const { crowns, fallbackRaw } = crownsOf(w, c, list);
    pending.set(c, { band: bandOf(rel), male: c.sex === 'male' && c.age >= 15, fill: cap > 0 ? (L.dm ?? 0) / cap : NaN, rel, crowns, fallbackRaw, list: list.slice() });
  };
  const from = w.time, animals = w.chimps.filter(c => c.alive && c.age >= 5).length;
  try {
    for (let i = 0, n = Math.round(hours * 240); i < n; i++) {
      tickWorld(w);
      for (const [c, p] of pending) {
        const cr = p.crowns.find(k => k.action === c.action && k.target === c.targetId);
        const rawBest = argmax(p.crowns, k => k.raw), foodBest = argmax(p.crowns, k => k.food);
        const chosen = cr ? cr.kind : c.action === 'forage' && c.targetId === -1 ? 'fallback' : c.action;
        samples.push({ band: p.band, male: p.male, fill: p.fill, rel: p.rel, crowns: p.crowns, fallbackRaw: p.fallbackRaw, chosen, chosenD: cr ? cr.d : null, chosenRawBest: cr ? cr === rawBest : null, chosenFoodBest: cr && foodBest ? cr === foodBest : null });
      }
      pending.clear();
    }
  } finally { rulesTap.fn = null; }
  return { samples, animals, from };
}

const BINS = [0.02, 0.05, 0.1, 0.2];
const hist = (v: number[]) => { const h = new Array(BINS.length + 1).fill(0); for (const x of v) { let i = 0; while (i < BINS.length && x >= BINS[i]) i++; h[i]++; } return h.map(k => v.length ? Math.round(100 * k / v.length) : 0); };
const med = (v: number[]) => { if (!v.length) return NaN; const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const f = (v: number, d = 2) => Number.isFinite(v) ? v.toFixed(d) : '—';
const pc = (a: number, b: number) => b ? `${Math.round(100 * a / b)}%` : '—';

function report(label: string, all: Sample[], animals: number, hours: number): string[] {
  const L: string[] = [];
  L.push(`### ${label}: ${all.length} decisions of animals aged 5 y or more (${animals} at the start, ${hours} h per checkpoint)`, '');
  L.push(`Histograms: share of decisions with the statistic in [0, 0.02) / [0.02, 0.05) / [0.05, 0.1) / [0.1, 0.2) / ≥ 0.2 (score units; the candidate jitter spans ±0.12). Crowns: options to a tree (in view, own or known-tree trips, joined trips, caller trips with a known crown); decisions with at least 2.`, '');
  L.push('| reserve band | decisions | with ≥ 2 crowns | crowns (median) | foregut fill (median) | range of values % | best − 2nd values % | range of food terms % | best − 2nd food terms % | jitter reverses the best | other terms reverse it (raw-best a joined trip) | chosen: crown (view / own / joined / caller) / fallback / other | chosen trips > 500 m | chosen trip distance (median m) |', '| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | ---: | ---: |');
  for (let b = 0; b < RESERVE_BINS.length; b++) {
    const s = all.filter(x => x.band === b); if (!s.length) continue;
    const two = s.filter(x => x.crowns.length >= 2);
    const range = two.map(x => Math.max(...x.crowns.map(k => k.raw)) - Math.min(...x.crowns.map(k => k.raw)));
    const gap = two.map(x => { const v = x.crowns.map(k => k.raw).sort((a, b2) => b2 - a); return v[0] - v[1]; });
    const twoF = two.filter(x => x.crowns.filter(k => Number.isFinite(k.food)).length >= 2);
    const rangeF = twoF.map(x => { const v = x.crowns.filter(k => Number.isFinite(k.food)).map(k => k.food); return Math.max(...v) - Math.min(...v); });
    const gapF = twoF.map(x => { const v = x.crowns.filter(k => Number.isFinite(k.food)).map(k => k.food).sort((a, b2) => b2 - a); return v[0] - v[1]; });
    const jitRev = two.filter(x => argmax(x.crowns, k => k.raw) !== argmax(x.crowns, k => k.raw + k.jit)).length;
    const othRev = twoF.filter(x => argmax(x.crowns, k => k.raw) !== argmax(x.crowns, k => k.food));
    const othJoined = othRev.filter(x => argmax(x.crowns, k => k.raw)!.kind === 'joined').length;
    const kinds = (k: string) => s.filter(x => x.chosen === k).length;
    const crownChosen = s.filter(x => x.chosenD !== null), trips = crownChosen.filter(x => x.chosen !== 'view');
    const tripD = trips.map(x => x.chosenD!).filter(Number.isFinite);
    L.push(`| ${RESERVE_BINS[b][0]} to ${RESERVE_BINS[b][1] < -1 ? -1 : RESERVE_BINS[b][1]} | ${s.length} | ${two.length} | ${f(med(s.map(x => x.crowns.length)), 0)} | ${f(med(s.map(x => x.fill)))} | ${hist(range).join(' / ')} | ${hist(gap).join(' / ')} | ${hist(rangeF).join(' / ')} | ${hist(gapF).join(' / ')} | ${pc(jitRev, two.length)} | ${pc(othRev.length, twoF.length)} (${pc(othJoined, twoF.length)}) | ${pc(crownChosen.length, s.length)} (${['view', 'own', 'joined', 'caller'].map(k => pc(kinds(k), s.length)).join(' / ')}) / ${pc(kinds('fallback'), s.length)} / ${pc(s.length - crownChosen.length - kinds('fallback'), s.length)} | ${pc(tripD.filter(d => d > 500).length, tripD.length)} (${tripD.length}) | ${f(med(tripD), 0)} |`);
  }
  return L;
}

function kmByBand(label: string, files: string[]): string[] {
  const rows = files.flatMap(file => (decodeLossless<{ energy: { animalDays?: (number | null)[][] } | null }>(gunzipSync(readFileSync(file)).toString('utf8')).energy?.animalDays ?? []));
  const L: string[] = [`### ${label}: ground km per animal-day by reserve band (per-animal records, ${files.length} part${files.length > 1 ? 's' : ''})`, ''];
  if (!rows.length) return [...L, 'no animal-day rows'];
  const last = Math.max(...rows.map(r => r[0] as number));
  L.push('| window days | group | reserve band | animal-days | ground km | walk + climb kcal | daylight travelling % | eat min | absorbed − spent |', '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const [a, b] of [[0, 89], [90, last]]) for (const { group, bin, cell } of byReserve(rows, a, b))
    L.push(`| ${a}–${b} | ${group} | ${bin[0]} to ${bin[1] < -1 ? -1 : bin[1]} | ${f(cell.n, 0)} | ${f(cell.walkKm)} | ${f(cell.terms.walk + cell.terms.climb, 0)} | ${f(100 * cell.acts.travel, 0)} | ${f(cell.eatMin, 0)} | ${f(cell.net, 0)} |`);
  return L;
}

function main(): void {
  const args = process.argv.slice(2);
  const all = (name: string) => args.flatMap((a, i) => a === `--${name}` && i + 1 < args.length ? [args[i + 1]] : []);
  const hours = +(all('hours')[0] ?? 12), out = all('out')[0];
  const L: string[] = [], json: Record<string, unknown> = {};
  for (const g of all('ckpt')) {
    const [label, files] = g.split('='), samples: Sample[] = [];
    let animals = 0;
    for (const file of files.split(',').filter(Boolean)) { const r = sample(file, hours); samples.push(...r.samples); animals += r.animals; console.error(`${label}: ${file.split('/').pop()} ${r.samples.length} decisions`); }
    L.push(...report(label, samples, animals, hours), '');
    json[label] = samples.map(s => ({ ...s, crowns: s.crowns.map(k => ({ kind: k.kind, d: k.d, raw: k.raw, jit: k.jit, food: k.food })) }));
  }
  for (const g of all('rows')) { const [label, files] = g.split('='); L.push(...kmByBand(label, files.split(',').filter(Boolean)), ''); }
  const text = L.join('\n') + '\n';
  if (out) { writeFileSync(`${out}.md`, text); writeFileSync(`${out}.json`, JSON.stringify(json, (_k, v) => typeof v === 'number' && !Number.isFinite(v) ? null : v)); console.error(`wrote ${out}.md and ${out}.json`); }
  else process.stdout.write(text);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
