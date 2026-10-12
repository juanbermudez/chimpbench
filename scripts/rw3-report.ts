// Stage RW3 (Track R; docs/staging/rw3-prereg.md §4 and §5): the registered statements about the small Taï adapters,
// read from the per-record files scripts/rw2-score.ts writes. No model, no raw file; the sealed part is never read.
//
//   pnpm exec tsx scripts/rw3-report.ts [--bench artifacts/rw3/bench] [--dir artifacts/rw2] [--ft artifacts/decide-ft/rw3]
//       [--md artifacts/rw3/tables/rw3-numbers.md] [--json f.json] [--no-reference]
//   pnpm exec tsx scripts/rw3-report.ts sizes [--dir artifacts/rw2] [--json f.json]     packet lengths and the projected scoring time (no outcome is used)
//
// --bench holds one folder per scored kernel, `<adapter>-own/` (base, r4-field-groom, rw3-tai-groom-s7, rw3-tai-groom-s11),
// each with tai-groom-<part>-<kernel>-records.jsonl for the kernels null, stack-own, gliner and gliner+fan2
// (scripts/rw3-run.sh eval writes them). What is printed and written is aggregate counts and rates only.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pairedDifference, type RecordScore } from '../src/rw/score';
import { RW2_SEED, type Rw2Record } from '../src/rw2/packet';
import { summarize2 } from '../src/rw2/score';
import { RW3_ADAPTER, RW3_DATASET, RW3_LABEL_SOURCE, RW3_RECIPE, RW3_RESULT_NAME, RW3_SEEDS } from './rw3-assemble';
import { loadRecords, sizeReport } from './rw2-score';

export const NGOGO_ADAPTER = 'r4-field-groom', BAR_RULE = 'stack-own';
/** Stage RW2's figures on the development part (rw2-prereg.md §8.1 and §8.4), which a valid run reproduces. */
export const RW3_REFERENCE = { records: 329, animals: 13, chance: 0.244, bar: 0.353, untuned: { plain: 0.301, fan: 0.295 }, ngogo: { plain: 0.319, fan: 0.328 } };

export interface KernelScores { plain: RecordScore[]; fan: RecordScore[] | null }
export interface SeedRun { seed: number; scores: KernelScores | null; manifest: Record<string, unknown> | null }
export interface Rw3Input {
  part: 'development' | 'train';
  chance: RecordScore[] | null; bar: RecordScore[] | null; untuned: KernelScores | null; ngogo: KernelScores | null; seeds: SeedRun[];
  /** The part's derived records, for the cut by the chooser's sex. */
  records: Rw2Record[];
  /** The sha256 of the training file on hand (its data manifest's): every adapter must have been trained on it. Undefined: not compared. */
  trainFileSha256?: string | null;
  /** What chance and the bar must read (S0). Null: not compared (tests on invented scores). */
  expect: { chance: number; bar: number } | null;
  reps?: number; bootSeed?: number;
}
type Paired = ReturnType<typeof pairedDifference>;
export type Side = 'above' | 'includes' | 'below' | 'not read';
export type Verdict = 'met' | 'seed-dependent: not shown' | 'with the fan-out only' | 'not shown' | 'below on both seeds' | 'not read';

const side = (d: Paired | null): Side => !d || d.ci[0] === null || d.ci[1] === null ? 'not read' : d.ci[0] > 0 ? 'above' : d.ci[1] < 0 ? 'below' : 'includes';
/** A statement over the training seeds: met only if every seed's interval lies above 0. */
function over(sides: Side[]): Verdict {
  if (!sides.length || sides.includes('not read')) return 'not read';
  if (sides.every(s => s === 'above')) return 'met';
  if (sides.every(s => s === 'below')) return 'below on both seeds';
  return sides.includes('above') || sides.includes('below') ? 'seed-dependent: not shown' : 'not shown';
}
/** The primary (plain) reading with the fan-out beside it: met with the fan-out only is never "met". */
const withFan = (plain: Verdict, fan: Verdict): Verdict => plain !== 'met' && plain !== 'not read' && plain !== 'below on both seeds' && fan === 'met' ? 'with the fan-out only' : plain;

const sameRecords = (a: RecordScore[], b: RecordScore[]) => a.length === b.length && a.every((s, i) => s.key === b[i].key);
const pair = (a: RecordScore[] | null | undefined, b: RecordScore[] | null | undefined, reps: number, seed: number, keep: (s: RecordScore) => boolean = () => true): Paired | null =>
  a && b && sameRecords(a, b) ? pairedDifference(a, b, keep, reps, seed) : null;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const top1 = (s: RecordScore[]) => r3(s.reduce((a, x) => a + x.hit, 0) / Math.max(1, s.length));

/** Every registered reading from the per-record scores. Aggregates only. */
export function rw3Report(input: Rw3Input) {
  const reps = input.reps ?? 2000, seed = input.bootSeed ?? RW2_SEED, sum = (s: RecordScore[] | null | undefined) => s ? summarize2(s, reps, seed) : null;
  const seeds = input.seeds.map(s => ({ ...s, name: `${RW3_ADAPTER}-s${s.seed}` }));
  const ask = ['plain', 'fan'] as const;
  type Ask = typeof ask[number];
  const kernels = { untuned: input.untuned, ngogo: input.ngogo };
  const against = (a: Ask, s: typeof seeds[number], what: 'untuned' | 'bar' | 'ngogo') => pair(s.scores?.[a], what === 'bar' ? input.bar : kernels[what]?.[a], reps, seed);
  const pairedFor = (a: Ask) => ({
    seeds: seeds.map(s => ({ seed: s.seed, untuned: against(a, s, 'untuned'), bar: against(a, s, 'bar'), ngogo: against(a, s, 'ngogo') })),
    between: seeds.length === 2 ? pair(seeds[0].scores?.[a], seeds[1].scores?.[a], reps, seed) : null,
    reference: { untunedMinusBar: pair(input.untuned?.[a], input.bar, reps, seed), ngogoMinusBar: pair(input.ngogo?.[a], input.bar, reps, seed), ngogoMinusUntuned: pair(input.ngogo?.[a], input.untuned?.[a], reps, seed) },
  });
  const paired = { plain: pairedFor('plain'), fan: pairedFor('fan') };

  // S0: the run is valid
  const faults: string[] = [], chance = sum(input.chance), bar = sum(input.bar);
  if (!input.chance || !input.bar) faults.push('chance or the bar is not on file');
  if (!seeds.length || seeds.some(s => !s.scores)) faults.push('a training seed has no scores on file');
  if (!input.untuned) faults.push('the untuned model has no scores on file');
  for (const s of seeds) {
    const m = s.manifest, h = (m?.hyperparameters ?? {}) as Record<string, unknown>;
    if (!m) { faults.push(`${s.name}: no manifest (not trained to the end)`); continue; }
    if (m.label_source !== RW3_LABEL_SOURCE) faults.push(`${s.name}: the manifest does not carry the label source`);
    if (m.sealedPartRead !== false || (m.leakCheck as { ok?: unknown } | undefined)?.ok !== true) faults.push(`${s.name}: the manifest does not say that the leak checks passed and the sealed part was not read`);
    if (m.adapter !== s.name || h.seed !== s.seed) faults.push(`${s.name}: the manifest is another adapter's or another seed's`);
    if (input.trainFileSha256 !== undefined && m.train_sha256 !== input.trainFileSha256) faults.push(`${s.name}: it was not trained on the training file on hand (the hashes differ)`);
    if (Object.entries(RW3_RECIPE).some(([k, v]) => h[k] !== v) || m.registered_recipe !== true || m.saved_epoch !== RW3_RECIPE.epochs) faults.push(`${s.name}: the hyperparameters are not the registered ones`);
  }
  for (const [name, k] of [['the untuned model', input.untuned], ['the Ngogo-taught adapter', input.ngogo], ...seeds.map(s => [s.name, s.scores] as [string, KernelScores | null])] as [string, KernelScores | null][]) {
    if (!k) continue;
    const refused = k.plain.filter(x => x.refused).length + (k.fan ?? []).filter(x => x.refused).length;
    if (refused) faults.push(`${name}: ${refused} refused answers`);
    if (input.bar && !sameRecords(k.plain, input.bar)) faults.push(`${name}: not the same records as the bar`);
  }
  const differs = seeds.map(s => s.scores && input.untuned && sameRecords(s.scores.plain, input.untuned.plain) ? s.scores.plain.filter((x, i) => x.index !== input.untuned!.plain[i].index).length : null);
  seeds.forEach((s, i) => { if (differs[i] === 0) faults.push(`${s.name}: every answer is the untuned model's (the adapter was probably not loaded)`); });
  if (input.expect && chance && bar && (chance.chance.pooled.value !== input.expect.chance || bar.top1Ties.pooled.value !== input.expect.bar))
    faults.push(`chance and the bar read ${chance.chance.pooled.value} and ${bar.top1Ties.pooled.value}, not the registered ${input.expect.chance} and ${input.expect.bar}: these are not stage RW2's development records`);
  const valid = !faults.length;

  const read = (a: Ask, what: 'untuned' | 'bar' | 'ngogo') => over(paired[a].seeds.map(s => side(s[what])));
  const s1 = withFan(read('plain', 'untuned'), read('fan', 'untuned')), s2 = withFan(read('plain', 'bar'), read('fan', 'bar')), s3 = withFan(read('plain', 'ngogo'), read('fan', 'ngogo'));
  const whole = !valid ? 'not read: the run is not valid (S0)' : s1 === 'not read' || s2 === 'not read' ? 'not read'
    : s2 === 'below on both seeds' ? 'below the simple rule'
      : s1 === 'met' && s2 === 'met' ? 'a small Taï adapter beats the simple rule on development'
        : s1 === 'met' ? 'the adapter learned about what the simple rule knows; no more is shown'
          : '557 choices did not teach the model anything this record can show; the Taï record stays a test, not a teacher, at this size';

  const byKey = new Map(input.records.map(r => [r.key, r])), strata = [...new Set(input.records.map(r => r.stratum))].sort();
  const cuts: [string, (s: RecordScore) => boolean][] = [['8 options or fewer', s => s.setSize <= 8], ['more than 8 options', s => s.setSize > 8],
    ...(strata.length > 1 ? strata.map(st => [st, (s: RecordScore) => s.partStratum === st] as [string, (s: RecordScore) => boolean]) : []),
    ['male choosers', s => byKey.get(s.key)?.focal.sex === 'm'], ['female choosers', s => byKey.get(s.key)?.focal.sex === 'f']];
  const cutRow = (s: RecordScore[] | null | undefined, f: (s: RecordScore) => boolean, ties = false) => { const x = (s ?? []).filter(f); return s && x.length ? r3(x.reduce((a, y) => a + (ties ? y.tieHit : y.hit), 0) / x.length) : null; };
  const agreement = seeds.length === 2 && seeds[0].scores && seeds[1].scores && sameRecords(seeds[0].scores.plain, seeds[1].scores.plain)
    ? { sameAnswer: r3(seeds[0].scores.plain.filter((x, i) => x.picked !== null && x.picked === seeds[1].scores!.plain[i].picked).length / seeds[0].scores.plain.length) } : null;
  return {
    part: input.part, valid, faults, records: input.bar?.length ?? 0, animals: bar?.individuals ?? 0, chance, bar,
    scores: { untuned: { plain: sum(input.untuned?.plain), fan: sum(input.untuned?.fan) }, ngogo: { plain: sum(input.ngogo?.plain), fan: sum(input.ngogo?.fan) },
      seeds: seeds.map((s, i) => ({ seed: s.seed, name: s.name, plain: sum(s.scores?.plain), fan: sum(s.scores?.fan), answersUnlikeTheUntunedModel: differs[i],
        fit: s.manifest ? { history: s.manifest.history ?? null, cost: s.manifest.cost ?? null } : null })) },
    paired, agreement,
    statements: { S0: valid ? 'valid' : 'NOT VALID', S1: valid ? s1 : 'not read', S2: valid ? s2 : 'not read', S3: valid ? s3 : 'not read',
      perSeed: paired.plain.seeds.map(s => ({ seed: s.seed, S1: side(s.untuned), S2: side(s.bar), S3: side(s.ngogo) })),
      fan: { S1: read('fan', 'untuned'), S2: read('fan', 'bar'), S3: read('fan', 'ngogo') },
      S4: paired.plain.between ? (paired.plain.between.isDifference ? 'the seeds differ: every statement is seed-dependent' : 'no difference between the seeds is shown') : 'not read', whole },
    cuts: cuts.map(([cut, f]) => ({ cut, records: (input.bar ?? []).filter(f).length, animals: new Set((input.bar ?? []).filter(f).map(s => s.focal)).size,
      chance: (() => { const x = (input.chance ?? []).filter(f); return x.length ? r3(x.reduce((a, y) => a + y.chance, 0) / x.length) : null; })(),
      bar: cutRow(input.bar, f, true), untuned: cutRow(input.untuned?.plain, f), ngogo: cutRow(input.ngogo?.plain, f), seeds: seeds.map(s => cutRow(s.scores?.plain, f)) })).filter(c => c.records > 0),
    reference: { untuned: input.untuned ? { plain: top1(input.untuned.plain), fan: input.untuned.fan ? top1(input.untuned.fan) : null } : null,
      ngogo: input.ngogo ? { plain: top1(input.ngogo.plain), fan: input.ngogo.fan ? top1(input.ngogo.fan) : null } : null },
  };
}
export type Rw3Report = ReturnType<typeof rw3Report>;

const MEANING: Record<'S1' | 'S2' | 'S3', Partial<Record<Verdict, string>>> = {
  S1: { met: 'teaching on 557 wild Taï choices raises top-1 on later and unseen Taï choices over the untuned model', 'not shown': 'not shown; with this record\'s power that is not "no effect"',
    'below on both seeds': 'the teaching made the model worse on this choice' },
  S2: { met: 'the adapter beats "the adult it most often groomed first before": it has learned more than a three-line rule knows', 'not shown': 'level with the bar within the interval: nothing is shown beyond the rule, and the rule is the cheaper kernel',
    'below on both seeds': 'below the simple rule; the rule remains the better kernel for this choice' },
  S3: { met: 'Taï labels teach more about Taï choices than Ngogo labels do', 'not shown': 'no difference is shown between a Taï-taught and a Ngogo-taught adapter; whatever either learned is not shown to be particular to the site',
    'below on both seeds': 'worse than the adapter taught another site\'s choices' },
};

/** The generated table (aggregates only: no key, no label of an individual). */
export function markdown(R: Rw3Report, o: { reference?: boolean } = {}): string {
  const L: string[] = [], t = (h: string[], rows: (string | number | null)[][]) => { L.push('', `| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(v => v ?? 'not on file').join(' | ')} |`), ''); };
  const iv = (m: { value: number | null; ci: (number | null)[] } | undefined) => !m || m.value === null ? 'not on file' : `${m.value} (${m.ci[0] ?? 'n/a'} to ${m.ci[1] ?? 'n/a'})`;
  const d = (p: Paired | null) => p ? `${p.difference} (${p.ci[0]} to ${p.ci[1]})` : 'not on file', yes = (p: Paired | null) => p ? (p.isDifference ? 'yes' : 'no') : 'not on file';
  const fit = R.part === 'train';
  L.push(`# RW3: the Taï-taught adapters on the ${R.part} part of the Taï record (generated)`, '',
    'Written by `scripts/rw3-report.ts`; do not edit by hand. Aggregate counts and rates only. Registration: `docs/staging/rw3-prereg.md`.', '',
    `Every figure for \`${RW3_ADAPTER}-s${RW3_SEEDS[0]}\` and \`-s${RW3_SEEDS[1]}\` is a result of a **${RW3_RESULT_NAME}** (label source: \`${RW3_LABEL_SOURCE}\`; two training seeds). `
    + 'Beside them: the untuned model, the Ngogo-taught adapter (`r4-field-groom`) and the simple rule `stack-own` (the bar). The sealed part is not opened.',
    ...(fit ? ['', '**This is the train part: a description of how closely the adapters fit the records they were taught. It is never a result.**'] : []), '',
    `${R.records} records of ${R.animals} animals; own view; shuffle 0. Top-1 of the answered option, pooled over records (for chance and the bar: the expected top-1 with ties split). Intervals: 95%, a bootstrap over animals. A difference is called one only if its interval excludes 0.`);
  L.push('', '## Scores');
  const kernelRow = (label: string, k: { plain: ReturnType<typeof summarize2> | null; fan: ReturnType<typeof summarize2> | null }) =>
    [label, iv(k.plain?.top1.pooled), iv(k.fan?.top1.pooled), iv(k.plain?.top1.equal), iv(k.plain?.top1MinusChance.pooled), k.plain ? k.plain.refused + (k.fan?.refused ?? 0) : null];
  t(['kernel', 'one call a record (the primary reading)', 'fanned out', 'each animal weighted equally, one call', 'minus chance, one call', 'refused'], [
    ['chance', iv(R.chance?.chance.pooled), '', iv(R.chance?.chance.equal), '', ''],
    ['the bar: the simple rule `stack-own`', iv(R.bar?.top1Ties.pooled), '', iv(R.bar?.top1Ties.equal), iv(R.bar?.tiesMinusChance.pooled), R.bar?.refused ?? null],
    kernelRow('the untuned model', R.scores.untuned), kernelRow('the Ngogo-taught adapter `r4-field-groom`', R.scores.ngogo),
    ...R.scores.seeds.map(s => kernelRow(`the Taï-taught adapter \`${s.name}\``, s))]);
  if (o.reference !== false && !fit) L.push(`Stage RW2 read (rw2-prereg.md §8.4): chance ${RW3_REFERENCE.chance}, the bar ${RW3_REFERENCE.bar}, the untuned model ${RW3_REFERENCE.untuned.plain} and ${RW3_REFERENCE.untuned.fan} fanned out, the Ngogo-taught adapter ${RW3_REFERENCE.ngogo.plain} and ${RW3_REFERENCE.ngogo.fan}. `
    + `Scored again here: the untuned model ${R.reference.untuned ? `${R.reference.untuned.plain} and ${R.reference.untuned.fan ?? 'not on file'}` : 'not on file'}, the Ngogo-taught adapter ${R.reference.ngogo ? `${R.reference.ngogo.plain} and ${R.reference.ngogo.fan ?? 'not on file'}` : 'not on file'}.`);
  for (const a of ['plain', 'fan'] as const) {
    const P = R.paired[a];
    L.push('', a === 'plain' ? '## Paired differences on the same records, one call a record (the primary reading)' : '## The same, fanned out (beside the primary reading)');
    const row = (label: string, p: Paired | null) => [label, p?.a ?? null, p?.b ?? null, d(p), p?.onlyA ?? null, p?.onlyB ?? null, yes(p)];
    t(['a minus b', 'a', 'b', 'difference (95% over animals)', 'only a right', 'only b right', 'a difference'], [
      ...P.seeds.flatMap(s => [row(`seed ${s.seed} minus the untuned model (S1)`, s.untuned), row(`seed ${s.seed} minus the bar (S2)`, s.bar), row(`seed ${s.seed} minus the Ngogo-taught adapter (S3)`, s.ngogo)]),
      row('seed against seed (S4)', P.between), row('reference: the untuned model minus the bar', P.reference.untunedMinusBar), row('reference: the Ngogo-taught adapter minus the bar', P.reference.ngogoMinusBar),
      row('reference: the Ngogo-taught adapter minus the untuned model', P.reference.ngogoMinusUntuned)]);
  }
  const S = R.statements, say = (id: 'S1' | 'S2' | 'S3', v: Verdict) => v === 'not read' ? 'not read' : `**${v}**${MEANING[id][v] ? `: ${MEANING[id][v]}` : ''}`;
  if (fit) L.push('', 'The registered statements are read on the development part only; none is read here.');
  else {
    L.push('', '## The statements (registered in rw3-prereg.md §5 before any run)', '',
      `- **S0, the run is valid:** ${R.valid ? 'yes' : `**NO**: ${R.faults.join('; ')}. Nothing else is read until this is repaired.`}`,
      `- **S1, the Taï choices taught the model something** (the adapter minus the untuned model, above 0 on both seeds): ${say('S1', S.S1)}. By seed: ${S.perSeed.map(p => `seed ${p.seed} ${p.S1}`).join(', ') || 'not read'}; fanned out: ${S.fan.S1}.`,
      `- **S2, it reaches the simple rule** (the adapter minus the bar): ${say('S2', S.S2)}. By seed: ${S.perSeed.map(p => `seed ${p.seed} ${p.S2}`).join(', ') || 'not read'}; fanned out: ${S.fan.S2}.`,
      `- **S3, the site's own choices against another site's** (the adapter minus the Ngogo-taught adapter): ${say('S3', S.S3)}. By seed: ${S.perSeed.map(p => `seed ${p.seed} ${p.S3}`).join(', ') || 'not read'}; fanned out: ${S.fan.S3}.`,
      `- **S4, the two seeds:** ${S.S4}${R.agreement ? `; they answer the same option on ${R.agreement.sameAnswer} of records` : ''}.`,
      `- **The whole, in the registered words:** ${S.whole}.`, '',
      'Power, stated before any score: no unpaired difference under about 0.08 to 0.10 and no paired one under about 0.04 to 0.06 can be shown on this record, so "not shown" is not "no effect". '
      + 'No result here changes the main label source, enters the simulation\'s loop or says when or whether chimpanzees groom.');
  }
  L.push('', '## Cuts (descriptions; nothing is claimed on them)', '', 'One call a record. Female choice and wide menus rest on few records.');
  t(['cut', 'records', 'animals', 'chance', 'the bar', 'the untuned model', 'the Ngogo-taught adapter', ...R.scores.seeds.map(s => `seed ${s.seed}`)], R.cuts.map(c => [c.cut, c.records, c.animals, c.chance, c.bar, c.untuned, c.ngogo, ...c.seeds]));
  const fits = R.scores.seeds.filter(s => s.fit);
  if (fits.length) {
    L.push('## The trainings (from the adapters\' manifests; the training loss describes fit and is not a score)');
    t(['adapter', 'answers unlike the untuned model\'s', 'mean training loss by epoch', 'training time', 'seconds an example', 'peak footprint'], fits.map(s => { const h = (s.fit!.history ?? []) as { train_loss?: number }[], c = (s.fit!.cost ?? {}) as Record<string, number>;
      return [`\`${s.name}\``, s.answersUnlikeTheUntunedModel, h.map(x => x.train_loss).join(', ') || null, c.training_seconds !== undefined ? `${Math.round(c.training_seconds / 6) / 10} min` : null, c.seconds_per_example ?? null, c.peak_footprint_gib !== undefined ? `${c.peak_footprint_gib} GiB` : null]; }));
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

/** The scores of one kernel folder of --bench, or null when its plain file is not on file. */
export function readKernel(bench: string, adapter: string, part: string): KernelScores | null {
  const file = (kernel: string) => `${bench}/${adapter}-own/${RW3_DATASET}-${part}-${kernel}-records.jsonl`, read = (f: string) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as RecordScore);
  return existsSync(file('gliner')) ? { plain: read(file('gliner')), fan: existsSync(file('gliner+fan2')) ? read(file('gliner+fan2')) : null } : null;
}
function readRule(bench: string, adapters: string[], part: string, rule: string): RecordScore[] | null {
  for (const a of adapters) { const f = `${bench}/${a}-own/${RW3_DATASET}-${part}-${rule}-records.jsonl`; if (existsSync(f)) return readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as RecordScore); }
  return null;
}

if (process.argv[1]?.endsWith('rw3-report.ts')) {
  const A = process.argv, has = (k: string) => A.includes(`--${k}`), arg = (k: string, d: string) => has(k) ? A[A.indexOf(`--${k}`) + 1] : d;
  try {
    if (A.some(a => /sealed/i.test(a))) throw new Error('this stage takes no sealed part (docs/staging/rw3-prereg.md §1)');
    const dir = arg('dir', 'artifacts/rw2'), part = arg('part', 'development') as 'development' | 'train';
    if (part !== 'development' && part !== 'train') throw new Error('--part takes development or train');
    if (A[2] === 'sizes') {
      // packet lengths under shuffle 0 and what one model pass would take; the answers are not used
      const out = Object.fromEntries((['development', 'train'] as const).map(p => { const z = sizeReport(loadRecords(dir, RW3_DATASET, p).eligible, 'own', RW2_SEED); return [p, z]; }));
      if (arg('json', '')) { mkdirSync(dirname(arg('json', '')), { recursive: true }); writeFileSync(arg('json', ''), JSON.stringify(out, null, 1) + '\n'); }
      console.log(JSON.stringify(out, null, 1));
    } else {
      const bench = arg('bench', 'artifacts/rw3/bench'), ft = arg('ft', 'artifacts/decide-ft/rw3'), names = RW3_SEEDS.map(s => `${RW3_ADAPTER}-s${s}`), folders = ['base', NGOGO_ADAPTER, ...names];
      const manifestOf = (name: string) => { const f = `${ft}/adapters/${name}/manifest.json`; return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown> : null; };
      const input: Rw3Input = { part, chance: readRule(bench, folders, part, 'null'), bar: readRule(bench, folders, part, BAR_RULE), untuned: readKernel(bench, 'base', part), ngogo: readKernel(bench, NGOGO_ADAPTER, part),
        seeds: RW3_SEEDS.map((seed, i) => ({ seed, scores: readKernel(bench, names[i], part), manifest: manifestOf(names[i]) })), records: loadRecords(dir, RW3_DATASET, part).eligible,
        trainFileSha256: existsSync(`${ft}/tai/data-manifest.json`) ? (JSON.parse(readFileSync(`${ft}/tai/data-manifest.json`, 'utf8')) as { trainFileSha256?: string }).trainFileSha256 ?? null : null,
        expect: part === 'development' && !has('no-reference') ? { chance: RW3_REFERENCE.chance, bar: RW3_REFERENCE.bar } : null };
      const report = rw3Report(input), md = markdown(report, { reference: !has('no-reference') });
      if (arg('md', '')) { mkdirSync(dirname(arg('md', '')), { recursive: true }); writeFileSync(arg('md', ''), md); }
      if (arg('json', '')) { mkdirSync(dirname(arg('json', '')), { recursive: true }); writeFileSync(arg('json', ''), JSON.stringify(report, null, 1) + '\n'); }
      console.log(md);
    }
  } catch (e) { console.error(`rw3-report: ${e instanceof Error ? e.message : e}`); process.exit(1); }
}
