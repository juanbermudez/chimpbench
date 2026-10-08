// Stage R4c (docs/staging/r4b-prereg.md §11.1): R4's own training file, unchanged, plus a supplement of real decision
// points at which a trip to a remembered food tree or a drink was the question: the points where the rules took one
// (positives) and as many where one was on the menu and the rules chose neither (negatives). The supplement comes from
// the pools of scripts/r4b-contexts.ts on the 20 days after R4's last training day, training animals only. Each decision
// point is used once; nothing is duplicated or weighted. The dev file is R4's, unchanged.
//
//   pnpm exec tsx scripts/r4c-assemble.ts --r4 <R4's contexts dir> [--parts artifacts/decide-ft/r4c/contexts/parts] [--out artifacts/decide-ft/r4c/contexts] [--md docs/staging/r4c-data.md]
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { removedWordingsIn, STATE_PACKET_VERSION } from './lib/packet-state';
import { RULES_LABEL_SOURCE } from './r4-assemble';
import { u01, type R4Rec } from './r4-contexts';
import type { R4bRec } from './r4b-contexts';

export const CLASSES = ['trip taken', 'drink taken', 'trip offered, not taken', 'drink offered, not taken'] as const;
export type SupClass = typeof CLASSES[number];
/** Places per world (prereg §11.1). */
export const PER_WORLD: Record<SupClass, number> = { 'trip taken': 300, 'drink taken': 75, 'trip offered, not taken': 300, 'drink offered, not taken': 75 };
/** The supplement's days: the 20 that follow R4's last training day. */
export const FIRST_DAY = 14, LAST_DAY = 33;

/** The class of a labelled decision point, or null when neither a trip to a remembered food tree nor a drink was on its menu. A point with both options offered and neither taken is a drink negative. */
export function classOfPoint(r: Pick<R4Rec, 'rgIndex' | 'options'>): SupClass | null {
  if (r.rgIndex < 0) return null;
  const fam = r.options[r.rgIndex].family, has = (f: string) => r.options.some(o => o.family === f);
  if (fam === 'food-trip') return 'trip taken';
  if (fam === 'drink') return 'drink taken';
  return has('drink') ? 'drink offered, not taken' : has('food-trip') ? 'trip offered, not taken' : null;
}
/** The lines of one world's pool taken for the supplement: each class in a fixed hash order; a kind's negatives are cut to its positives. */
export function takeSupplement(rows: { id: string; cls: SupClass | null; line: number }[]): Map<number, SupClass> {
  const taken = new Map<number, SupClass>();
  const order = (c: SupClass) => rows.filter(r => r.cls === c).map(r => ({ r, k: u01(`r4c-take:${c}:${r.id}`) })).sort((a, b) => a.k - b.k || a.r.line - b.r.line).map(x => x.r);
  for (const [pos, neg] of [['trip taken', 'trip offered, not taken'], ['drink taken', 'drink offered, not taken']] as [SupClass, SupClass][]) {
    const p = order(pos).slice(0, PER_WORLD[pos]), n = order(neg).slice(0, Math.min(PER_WORLD[neg], p.length));
    for (const r of p.slice(0, n.length)) taken.set(r.line, pos);   // equal numbers of a kind: a short side cuts the other
    for (const r of n) taken.set(r.line, neg);
  }
  return taken;
}

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };

if (process.argv[1]?.endsWith('r4c-assemble.ts')) {
  const r4 = resolve(arg('r4', '')), out = resolve(arg('out', 'artifacts/decide-ft/r4c/contexts')), parts = resolve(arg('parts', `${out}/parts`));
  const r4Text = readFileSync(`${r4}/train.jsonl`, 'utf8'), devText = readFileSync(`${r4}/dev.jsonl`, 'utf8'), r4Manifest = JSON.parse(readFileSync(`${r4}/manifest.json`, 'utf8')) as { splits: Record<string, { sha256: string }> };
  if (sha(r4Text) !== r4Manifest.splits.train.sha256 || sha(devText) !== r4Manifest.splits.dev.sha256) throw new Error('R4\'s train or dev file is not the one its manifest names');
  const base = r4Text.split('\n').filter(Boolean).map(l => JSON.parse(l) as R4Rec), ids = new Set(base.map(r => r.id)), baseAnimals = new Set(base.map(r => `${r.seed}:${r.chimpId}`));
  const devAnimals = new Set(devText.split('\n').filter(Boolean).map(l => JSON.parse(l) as R4Rec).map(r => `${r.seed}:${r.chimpId}`));
  const sup: (R4bRec & { supplement: SupClass })[] = [], worlds: unknown[] = [];
  for (const f of readdirSync(parts).filter(x => x.endsWith('.jsonl')).sort()) {
    const meta = JSON.parse(readFileSync(`${parts}/${f.replace(/\.jsonl$/, '.meta.json')}`, 'utf8')) as { seed: number; base: string; argv: string[]; records: number; worldHash: string; p: number; burnIn: number; days: number };
    const lines = readFileSync(`${parts}/${f}`, 'utf8').split('\n').filter(Boolean), seen = new Map<string, number>();
    const pool = lines.map((l, line) => { const r = JSON.parse(l) as R4bRec, n = (seen.get(r.id) ?? 0) + 1; seen.set(r.id, n); return { r, id: n === 1 ? r.id : `${r.id}~${n}`, line }; })
      .filter(x => x.r.split === 'train' && x.r.day >= FIRST_DAY && x.r.day <= LAST_DAY).map(x => ({ id: x.id, cls: classOfPoint(x.r), line: x.line }));
    const taken = takeSupplement(pool), count = (m: Iterable<SupClass | null>) => { const c: Record<string, number> = {}; for (const k of m) if (k) c[k] = (c[k] ?? 0) + 1; return c; };
    for (const [line, cls] of taken) { const r = JSON.parse(lines[line]) as R4bRec; sup.push({ ...r, id: pool.find(x => x.line === line)!.id, supplement: cls }); }
    worlds.push({ file: f, seed: meta.seed, base: meta.base, argv: meta.argv, burnIn: meta.burnIn, days: meta.days, p: meta.p, records: meta.records, worldHash: meta.worldHash, trainAnimalPoints: pool.length, available: count(pool.map(x => x.cls)), taken: count(taken.values()) });
  }
  sup.sort((a, b) => a.seed - b.seed || a.base.localeCompare(b.base) || a.tick - b.tick || a.chimpId - b.chimpId || a.id.localeCompare(b.id));
  if (sup.some(r => ids.has(r.id))) throw new Error('a supplement record is already in R4\'s training file');
  if (new Set(sup.map(r => r.id)).size !== sup.length) throw new Error('a supplement record is used twice');
  if (sup.some(r => devAnimals.has(`${r.seed}:${r.chimpId}`) || r.seed === 21)) throw new Error('a dev animal or the held-out seed is in the supplement');
  let removed = 0; for (const r of sup) removed += removedWordingsIn(r.packet).length;
  if (removed) throw new Error(`${removed} supplement packets hold a removed wording`);
  const supText = sup.map(r => JSON.stringify(r)).join('\n') + '\n', text = r4Text + supText;   // R4's file first, byte for byte
  writeFileSync(`${out}/train.jsonl`, text); writeFileSync(`${out}/dev.jsonl`, devText); writeFileSync(`${out}/supplement.jsonl`, supText);
  const tally = <T>(xs: T[], of: (x: T) => string) => { const c: Record<string, number> = {}; for (const x of xs) { const k = of(x); c[k] = (c[k] ?? 0) + 1; } return Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1])); };
  const fam = (r: R4Rec) => r.options[r.rgIndex].family, lab = (rows: R4Rec[]) => rows.filter(r => r.rgIndex >= 0), all = [...base, ...sup] as R4Rec[];
  const part = (rows: R4Rec[]) => ({ records: rows.length, labelled: lab(rows).length, draws: rows.filter(r => r.draw).length, keptOrArrived: rows.filter(r => !r.draw).length, animals: new Set(rows.map(r => `${r.seed}:${r.chimpId}`)).size,
    byBase: tally(rows, r => r.base), byPhase: tally(rows, r => r.phase), labelFamily: tally(lab(rows), fam), tripLabels: lab(rows).filter(r => fam(r) === 'food-trip').length, drinkLabels: lab(rows).filter(r => fam(r) === 'drink').length,
    tripLabelsKeptByTheGate: lab(rows).filter(r => fam(r) === 'food-trip' && !r.draw).length, drinkLabelsByPhase: tally(lab(rows).filter(r => fam(r) === 'drink'), r => r.phase),
    tripOnMenu: rows.filter(r => r.options.some(o => o.family === 'food-trip')).length, drinkOnMenu: rows.filter(r => r.options.some(o => o.family === 'drink')).length });
  const manifest = { stage: 'R4c', label_source: RULES_LABEL_SOURCE,
    label_note: 'An engine trained on these labels inherits the rules\' judgment: it is taught to do what the rules did, from state alone.',
    input: `the state-only packet ${STATE_PACKET_VERSION} (scripts/lib/packet-state.ts), unchanged from R4`,
    selection: `R4's training file unchanged, plus decision points of training animals on days ${FIRST_DAY} to ${LAST_DAY} at which the rules took a trip to a remembered food tree or a drink, and as many at which one was on the menu and the rules chose neither (docs/staging/r4b-prereg.md §11.1). Each point once; weight 1. This raises the share of trip and drink decisions above their natural share.`,
    commit: execSync('git rev-parse --short HEAD').toString().trim(), perWorld: PER_WORLD, days: [FIRST_DAY, LAST_DAY], worlds,
    r4: { dir: r4, trainSha256: sha(r4Text), devSha256: sha(devText) }, supplementByClass: tally(sup, r => r.supplement), newAnimalsInSupplement: [...new Set(sup.map(r => `${r.seed}:${r.chimpId}`))].filter(a => !baseAnimals.has(a)).length,
    removedWordingsFound: removed, splits: { train: { ...part(all), sha256: sha(text), recordIdsSha256: sha(all.map(r => r.id).sort().join('\n')) }, dev: { sha256: sha(devText) } }, parts: { r4: part(base), supplement: part(sup as R4Rec[]) } };
  writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
  // the data table (every number from the counts above)
  const P = manifest.parts, T = manifest.splits.train, share = (n: number, d: number) => `${n} (${(100 * n / d).toFixed(1)}%)`;
  const md = ['# R4c: the training data (generated by scripts/r4c-assemble.ts; do not edit)', '', `Registration: \`docs/staging/r4b-prereg.md\` §11.1. Assembled at ${manifest.commit}. R4's training file is first, byte for byte (sha256 ${manifest.r4.trainSha256.slice(0, 12)}…); the dev file is R4's. Labels: the rules' decisions.`, '',
    '## The supplement, by world (training animals, days 14 to 33)', '', `| world | decision points of training animals | ${CLASSES.map(c => `${c}: available`).join(' | ')} | ${CLASSES.map(c => `${c}: taken`).join(' | ')} |`, `|---|---|${CLASSES.map(() => '---|---').join('|')}|`,
    ...(worlds as { seed: number; base: string; trainAnimalPoints: number; available: Record<string, number>; taken: Record<string, number> }[]).map(w => `| seed ${w.seed}, ${w.base} | ${w.trainAnimalPoints} | ${CLASSES.map(c => w.available[c] ?? 0).join(' | ')} | ${CLASSES.map(c => w.taken[c] ?? 0).join(' | ')} |`), '',
    '## The training set', '', '| | R4\'s file | the supplement | R4c\'s training set |', '|---|---|---|---|',
    ...([['records', x => x.records], ['labelled', x => x.labelled], ['draws', x => x.draws], ['kept or arrived acts', x => x.keptOrArrived], ['animals', x => x.animals],
      ['the rules take a trip to a remembered food tree (share of labelled)', x => share(x.tripLabels, x.labelled)], ['of those, trips the gate kept under way', x => x.tripLabelsKeptByTheGate], ['the rules drink (share of labelled)', x => share(x.drinkLabels, x.labelled)],
      ['a drink, by day / dawn / dusk / night', x => ['day', 'dawn', 'dusk', 'night'].map(p => x.drinkLabelsByPhase[p] ?? 0).join(' / ')], ['a trip to a remembered food tree on the menu', x => x.tripOnMenu], ['a drink on the menu', x => x.drinkOnMenu],
      ...['feed', 'rest', 'nest', 'social-move', 'affiliative', 'greet', 'aggression'].map(f => [`the rules' decision: ${f}`, (x: ReturnType<typeof part>) => x.labelFamily[f] ?? 0] as [string, (x: ReturnType<typeof part>) => string | number]),
      ['light: day / dawn / dusk / night', x => ['day', 'dawn', 'dusk', 'night'].map(p => x.byPhase[p] ?? 0).join(' / ')]] as [string, (x: ReturnType<typeof part>) => string | number][]).map(([k, of]) => `| ${k} | ${of(P.r4)} | ${of(P.supplement)} | ${of(T)} |`), '',
    `Supplement by class: ${Object.entries(manifest.supplementByClass).map(([k, v]) => `${k} ${v}`).join('; ')}. Animals in the supplement that R4's file does not hold: ${manifest.newAnimalsInSupplement}. Removed wordings found: ${removed}.`, ''].join('\n');
  if (arg('md', '')) writeFileSync(resolve(arg('md', '')), md);
  console.log(md);
}
