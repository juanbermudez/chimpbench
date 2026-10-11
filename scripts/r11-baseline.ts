// Stage R11 (docs/staging/r11-prereg.md §13.2): the like-for-like wording baseline, an optional model step. The reading
// W1 (§11.4) sets each new adapter beside 0.386, the first adapter (r4-rules-state) scored with neutral option labels on
// stage R4's held-out draws, which are other draws than this stage's. Here the first adapter is scored on THIS stage's
// held-out fresh draws (seed 21), each rendered two ways from its saved context:
//   oldState    its own packet: the state-only packet r4-state-1 (scripts/lib/packet-state.ts) with the rules' wording
//               on the options, which is what the loop's `old-…` arms send;
//   oldNeutral  the same state lines without `urgent`, each option as its neutral label and the one-sentence
//               instruction (src/providers/packet.ts neutralized: stage R8's wording test, scripts/r8-rerender.ts).
// A description beside W1: it decides no mark and enters no statement, and W1 stays as registered.
//
//   pnpm exec tsx scripts/r11-baseline.ts render [--dir artifacts/decide-ft/r11] [--parts <dir>/parts] [--out <dir>/eval]
//       no model: <out>/baseline.jsonl ({id, packets: {oldState, oldNeutral}} per held-out fresh draw, for
//       training/decide_ft/em_score.py) and <out>/baseline.manifest.json. It stops unless, for every draw, the options
//       and the instruction of oldNeutral are exactly those of the P5b packet of the same draw, oldNeutral carries
//       none of the rules' wording, and the state lines of the two renderings differ only by the `urgent` line.
//   pnpm exec tsx scripts/r11-baseline.ts report [--dir …] [--scores <dir>/eval] [--md artifacts/r11/tables/r11-baseline.md] [--wording docs/staging/r8-wording-numbers.md]
//       no model: the table from <scores>/baseline.r4-rules-state.jsonl (rows {id, packet, provider, probs})
//   … report --fake   the dry run: the score file is first written by a hash of each option's text (the fake worker's
//                     rule; no model, never a result), then the table is made from it
// Then, with the model (the integrator; scripts/r11-run.sh baseline does all of it with the guards of a model step):
//   MGOGO_FT_ROOT=<folder holding adapters/r4-rules-state> training/decide_ft/r4_py.sh em_score.py --in <dir>/eval/baseline.jsonl \
//     --packets oldState,oldNeutral --provider r4-rules-state --out <dir>/eval/baseline.r4-rules-state.jsonl
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { neutralized, type LocalPacket } from '../server/decide';
import type { DecisionContext } from '../src/types';
import { buildStateOnlyQuestion, removedWordingsIn, STATE_PACKET_VERSION, tokensOf } from './lib/packet-state';
import { argmax, crossEntropy, entropy } from './lib/soft-labels';
import { kindOfFamily, TEST_SEEDS } from './r4-contexts';
import { uniqueIds, type R11Row } from './r11-assemble';
import type { R11Rec } from './r11-contexts';
import { boot, fakeProbs, wordingBaseline } from './r11-offline';
import { leakedIn } from './r8-rerender';

/** The first adapter, and the names of its two renderings in the file that is scored. */
export const OLD_ADAPTER = 'r4-rules-state', BASELINE_PACKETS = ['oldState', 'oldNeutral'] as const;
export type BaselinePackets = Record<(typeof BASELINE_PACKETS)[number], LocalPacket>;

/** The two renderings of one packet 5 context (observeV5 1): the first adapter's own packet, and that packet without the rules' wording. */
export function baselinePackets(ctx: DecisionContext): BaselinePackets {
  if (ctx.packet !== 5) throw new Error('the baseline needs a packet 5 context (observeV5 1): its options carry what each act is');
  const oldState = buildStateOnlyQuestion(ctx);
  return { oldState, oldNeutral: neutralized(ctx, oldState) };
}

/** Why a pair of renderings is not like for like with the P5b packet of the same draw; '' when it is. */
export function baselineFault(b: BaselinePackets, p5b: LocalPacket): string {
  if (JSON.stringify(b.oldNeutral.questions) !== JSON.stringify(p5b.questions)) return 'the options or the instruction of the neutral rendering are not those of the P5b packet';
  const leaked = leakedIn(b.oldNeutral);
  if (leaked.length) return `the neutral rendering carries the rules' wording (${leaked.join(' | ')})`;
  const { urgent: _urgent, ...rest } = b.oldState.state;
  if (JSON.stringify(rest) !== JSON.stringify(b.oldNeutral.state)) return 'the state lines of the two renderings differ by more than the `urgent` line';
  if (Object.keys(b.oldState.questions.action.criteria).join() !== Object.keys(p5b.questions.action.criteria).join()) return 'the first adapter\'s packet does not hold the same options';
  if (removedWordingsIn(b.oldState).length) return `the state-only packet carries a wording stage R4 removed (${removedWordingsIn(b.oldState).join(', ')})`;
  return '';
}

type Probs = Map<string, number[]>;
const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
const animal = (r: { seed: number; chimpId: number }) => `${r.seed}:${r.chimpId}`;
const KINDS = ['feeding', 'travel', 'rest', 'social'] as const;

/**
 * The baseline's numbers (prereg §13.2, points 2 and 4): per rendering the top-1 agreement with the rules' pick and the
 * divergence from the rules' distribution, each with a 95% interval over animals; the paired difference neutral less
 * wording; the same agreement by kind of the rules' pick; and on day and dawn menus with a trip to food the mean
 * probability on the trip against the label's.
 */
export function baselineReport(fresh: R11Row[], scores: Record<string, Probs>) {
  const q = (r: R11Row) => r.options.map((_, i) => r.soft![`c${i}`]);
  const rows = fresh.filter(r => r.soft && BASELINE_PACKETS.every(n => scores[n]?.has(r.id)));
  const pr = (r: R11Row, name: string) => { const p = scores[name].get(r.id)!; if (p.length !== r.options.length) throw new Error(`${name}: ${p.length} probabilities for the ${r.options.length} options of ${r.id}`); return p; };
  const hit = (r: R11Row, name: string) => +(argmax(pr(r, name)) === r.rgIndex), div = (r: R11Row, name: string) => crossEntropy(q(r), pr(r, name)) - entropy(q(r));
  const over = (set: R11Row[], v: (r: R11Row) => number, tag: string) => boot(set.map(r => ({ key: animal(r), v: v(r) })), `r11-baseline:${tag}`);
  const tripIdx = (r: R11Row) => r.options.map((o, i) => (o.family === 'food-trip' ? i : -1)).filter(i => i >= 0), on = (p: number[], idx: number[]) => idx.reduce((s, i) => s + p[i], 0);
  const trips = rows.filter(r => (r.phase === 'day' || r.phase === 'dawn') && tripIdx(r).length > 0);
  const per = (name: string) => ({ top1: over(rows, r => hit(r, name), `top:${name}`), divergence: over(rows, r => div(r, name), `div:${name}`),
    trip: { mean: mean(trips.map(r => on(pr(r, name), tripIdx(r)))), lessLabel: over(trips, r => on(pr(r, name), tripIdx(r)) - on(q(r), tripIdx(r)), `trip:${name}`), topPick: mean(trips.map(r => +tripIdx(r).includes(argmax(pr(r, name))))) } });
  return { draws: rows.length, animals: new Set(rows.map(animal)).size, unscored: fresh.filter(r => r.soft).length - rows.length,
    chance: mean(rows.map(r => 1 / r.options.length)), ceiling: mean(rows.map(r => +(argmax(q(r)) === r.rgIndex))),
    oldState: per('oldState'), oldNeutral: per('oldNeutral'), difference: over(rows, r => hit(r, 'oldNeutral') - hit(r, 'oldState'), 'top:difference'),
    byKind: KINDS.map(k => { const set = rows.filter(r => kindOfFamily(r.options[r.rgIndex].family) === k); return { kind: k, draws: set.length, oldState: mean(set.map(r => hit(r, 'oldState'))), oldNeutral: mean(set.map(r => hit(r, 'oldNeutral'))) }; }),
    trips: { menus: trips.length, rulesTookIt: mean(trips.map(r => +tripIdx(r).includes(r.rgIndex))), labelMass: mean(trips.map(r => on(q(r), tripIdx(r)))) } };
}

/** A score file of training/decide_ft/em_score.py as probabilities by packet name and record id. */
export function readScores(file: string): Record<string, Probs> {
  const out: Record<string, Probs> = {};
  for (const l of readFileSync(file, 'utf8').split('\n')) { if (!l.trim()) continue; const s = JSON.parse(l) as { id: string; packet: string; probs: number[] }; (out[s.packet] ??= new Map()).set(s.id, s.probs); }
  return out;
}

if (process.argv[1]?.endsWith('r11-baseline.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const mode = process.argv[2], dir = resolve(arg('dir', 'artifacts/decide-ft/r11'));
  const read = <T>(file: string): T[] => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as T);
  const sha = (text: string) => createHash('sha256').update(text).digest('hex');
  const fresh = read<R11Row>(`${dir}/eval/test.jsonl`).filter(r => r.label === 'fresh' && r.soft);
  if (mode === 'render') {
    const out = resolve(arg('out', `${dir}/eval`)), parts = resolve(arg('parts', `${dir}/parts`)), want = new Set(fresh.map(r => r.id)), ctx = new Map<string, DecisionContext>();
    // the contexts of the held-out records, from the sampler's parts, under the ids the assembly gave them
    for (const f of readdirSync(parts).filter(x => x.endsWith('.jsonl')).sort()) {
      if (!TEST_SEEDS.includes(JSON.parse(readFileSync(`${parts}/${f.replace(/\.jsonl$/, '.meta.json')}`, 'utf8')).seed)) continue;
      for (const r of uniqueIds(read<R11Rec>(`${parts}/${f}`))) if (want.has(r.id)) ctx.set(r.id, r.context);
    }
    const p5b = new Map(read<{ id: string; packets: Record<string, LocalPacket> }>(`${dir}/eval/all.jsonl`).filter(r => want.has(r.id)).map(r => [r.id, r.packets.p5b]));
    const all: { id: string; packets: BaselinePackets }[] = [], tok = { oldState: [] as number[], oldNeutral: [] as number[], p5b: [] as number[] };
    let options = 0, reworded = 0, urgent = 0;
    for (const r of fresh) {
      const c = ctx.get(r.id), whole = p5b.get(r.id);
      if (!c || !whole) throw new Error(`held-out record ${r.id}: ${c ? 'its P5b packet is not in eval/all.jsonl' : 'its context is not in the sampler\'s parts'}`);
      const b = baselinePackets(c), fault = baselineFault(b, whole);
      if (fault) throw new Error(`held-out record ${r.id}: ${fault}; nothing was written`);
      if (Object.keys(b.oldState.questions.action.criteria).length !== r.options.length) throw new Error(`held-out record ${r.id}: the packet's options are not the record's`);
      for (const k of Object.keys(b.oldState.questions.action.criteria)) { options++; reworded += +(b.oldState.questions.action.criteria[k] !== b.oldNeutral.questions.action.criteria[k]); }
      urgent += +(b.oldState.state.urgent !== undefined);
      tok.oldState.push(tokensOf(b.oldState)); tok.oldNeutral.push(tokensOf(b.oldNeutral)); tok.p5b.push(tokensOf(whole));
      all.push({ id: r.id, packets: b });
    }
    const text = all.map(r => JSON.stringify(r)).join('\n') + '\n', file = `${out}/baseline.jsonl`, scored = `${out}/baseline.${OLD_ADAPTER}.jsonl`;
    // a score file on hand was made from the packets on file: packets that would differ now must not be read with it
    if (existsSync(file) && existsSync(scored) && sha(readFileSync(file, 'utf8')) !== sha(text)) throw new Error(`${file} is on file with a score file, and the held-out records now give other packets; delete ${file} and ${scored} to render and score again`);
    const st = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return { median: s[s.length >> 1], p95: s[Math.min(s.length - 1, Math.floor(0.95 * s.length))], max: s[s.length - 1], mean: +mean(s).toFixed(1) }; };
    const manifest = { stage: 'R11', what: 'the like-for-like wording baseline (prereg §13.2): this stage\'s held-out fresh draws rendered as the first adapter\'s own state-only packet, with the rules\' wording and with neutral options',
      adapter: OLD_ADAPTER, packet: STATE_PACKET_VERSION, source: `${dir}/eval/test.jsonl`, sourceSha256: sha(readFileSync(`${dir}/eval/test.jsonl`, 'utf8')), draws: all.length, animals: new Set(fresh.map(animal)).size, packets: BASELINE_PACKETS, packetsToScore: all.length * BASELINE_PACKETS.length,
      sha256: sha(text), commit: execSync('git rev-parse --short HEAD').toString().trim(), dirty: execSync('git status --porcelain').toString().trim() !== '',
      checks: { neutralOptionsAndInstructionAreTheP5bPackets: `${all.length} of ${all.length}`, rulesWordingInNeutral: 0, stateLinesDifferOnlyByUrgent: `${all.length} of ${all.length}`, optionsReworded: `${reworded} of ${options}`, urgentLineRemovedFrom: urgent },
      tokensEstimate: { oldState: st(tok.oldState), oldNeutral: st(tok.oldNeutral), p5b: st(tok.p5b) },
      limits: 'The first adapter was trained with the rules\' wording, on one-hot picks with kept acts among its labels; the neutral rendering is an input it never saw. A description beside W1, never a mark.',
      next: `score ${file} with ${OLD_ADAPTER} on both packets (scripts/r11-run.sh baseline), then \`scripts/r11-baseline.ts report\`` };
    mkdirSync(out, { recursive: true });
    writeFileSync(file, text); writeFileSync(`${out}/baseline.manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
    console.log(JSON.stringify(manifest, null, 1));
  } else if (mode === 'report') {
    const scoresDir = resolve(arg('scores', `${dir}/eval`)), md = arg('md', 'artifacts/r11/tables/r11-baseline.md'), fake = process.argv.includes('--fake'), file = `${scoresDir}/baseline.${OLD_ADAPTER}.jsonl`;
    if (fake) {
      if (scoresDir === resolve(`${dir}/eval`)) throw new Error('--fake never writes into the stage\'s own eval folder: name another folder with --scores');
      const rows = read<{ id: string; packets: Record<string, LocalPacket> }>(`${scoresDir}/baseline.jsonl`);
      writeFileSync(file, rows.flatMap(r => BASELINE_PACKETS.map(n => JSON.stringify({ id: r.id, packet: n, provider: OLD_ADAPTER, probs: fakeProbs(r.packets[n], OLD_ADAPTER).map(v => +v.toFixed(6)) }))).join('\n') + '\n');
    }
    const L: string[] = [], p = (s = '') => L.push(s), f = (v: number | null | undefined, d = 3) => (v === null || v === undefined || !Number.isFinite(v) ? 'no value' : v.toFixed(d)), n = (v: number) => Math.round(v).toLocaleString('en-US');
    const ci = (b: { mean: number; lo: number; hi: number }, d = 3) => `${f(b.mean, d)} (${f(b.lo, d)} to ${f(b.hi, d)})`;
    const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
    const wordingFile = arg('wording', 'docs/staging/r8-wording-numbers.md'), wording = existsSync(resolve(wordingFile)) ? wordingBaseline(readFileSync(resolve(wordingFile), 'utf8')) : null;
    p('# Stage R11: the like-for-like wording baseline (numbers)');
    p();
    p(`Generated by \`scripts/r11-baseline.ts\` at head ${git('rev-parse --short HEAD')} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Registration: [r11-prereg.md](r11-prereg.md) §13.2. No number here is typed.`);
    p();
    if (fake) { p('**DRY RUN. The "model" below is a hash of each option\'s text (the fake worker\'s rule): no model was loaded and nothing here is a result. It proves that the step\'s files are written and read.**'); p(); }
    p(`**A description beside the reading W1, never a mark.** W1 (prereg §11.4) stays as registered, against stage R8's 0.386, which the first adapter (\`${OLD_ADAPTER}\`) scored with neutral option labels on stage R4's held-out draws. Here the same adapter is scored on this stage's own held-out fresh draws, on its own packet (the state-only packet \`${STATE_PACKET_VERSION}\`), with the rules' wording on the options and with neutral option labels (the options and the instruction of the P5b packet of the same draw). That adapter was trained with the wording, on one-hot picks with kept acts among its labels; the neutral rendering is an input it never saw.`);
    p();
    if (!existsSync(file)) { p(`**Not on file.** \`${OLD_ADAPTER}\` has not been scored on these draws (\`scripts/r11-run.sh baseline\`, an optional model step).`); }
    else {
      const r = baselineReport(fresh, readScores(file));
      p(`Held-out fresh draws scored on both renderings: ${n(r.draws)} of ${r.animals} animals${r.unscored ? ` (${r.unscored} not scored)` : ''}. Intervals: 95% bootstrap over animals, 2,000 resamples. Chance is ${f(r.chance)}; the option the rules took is the label's top option at ${f(r.ceiling)} (no reader of the state and the menu can agree more often).`);
      p();
      p('| The first adapter on its own packet | Top-1, the rules\' pick | Divergence from the rules\' distribution, nats |');
      p('| --- | --- | --- |');
      p(`| with the rules' wording on the options | ${ci(r.oldState.top1)} | ${ci(r.oldState.divergence)} |`);
      p(`| with neutral options | ${ci(r.oldNeutral.top1)} | ${ci(r.oldNeutral.divergence)} |`);
      p(`| neutral less wording, paired on the same draws | ${ci(r.difference)} | |`);
      if (wording) p(`| stage R8's test on stage R4's ${n(wording.draws)} held-out draws (\`${wordingFile}\`): wording, then neutral | ${f(wording.withWording)}, then ${f(wording.neutral)} | |`);
      p();
      p('| Kind of the rules\' pick | Draws | With the rules\' wording | Neutral options | Difference |');
      p('| --- | --- | --- | --- | --- |');
      p(`| all | ${n(r.draws)} | ${f(r.oldState.top1.mean)} | ${f(r.oldNeutral.top1.mean)} | ${f(r.oldNeutral.top1.mean - r.oldState.top1.mean)} |`);
      for (const k of r.byKind) p(`| ${k.kind} | ${n(k.draws)} | ${f(k.oldState)} | ${f(k.oldNeutral)} | ${f(k.oldNeutral - k.oldState)} |`);
      p();
      p(`**The trip to food** (day and dawn menus with a trip: ${n(r.trips.menus)}; the rules took it at ${f(r.trips.rulesTookIt)}, the label puts ${f(r.trips.labelMass)} on it). On stage R4's own draws this adapter put 0.155 on the trip where the rules took 0.23.`);
      p();
      p('| The first adapter on its own packet | Mean probability on the trip | Less the label\'s mass (paired) | Top pick is the trip |');
      p('| --- | --- | --- | --- |');
      p(`| with the rules' wording on the options | ${f(r.oldState.trip.mean)} | ${ci(r.oldState.trip.lessLabel)} | ${f(r.oldState.trip.topPick)} |`);
      p(`| with neutral options | ${f(r.oldNeutral.trip.mean)} | ${ci(r.oldNeutral.trip.lessLabel)} | ${f(r.oldNeutral.trip.topPick)} |`);
      p();
      p('Each adapter of this stage against these two rows, paired on the same draws, is in [r11-offline.md](r11-offline.md) §12.');
      mkdirSync(resolve(md, '..'), { recursive: true });
      writeFileSync(resolve(arg('json', md.replace(/\.md$/, '.json'))), JSON.stringify({ fake, provider: OLD_ADAPTER, ...r }, null, 1) + '\n');
    }
    mkdirSync(resolve(md, '..'), { recursive: true });
    writeFileSync(resolve(md), L.join('\n') + '\n');
    console.log(`wrote ${md}${existsSync(file) ? '' : ' (no score file: the baseline is not on file)'}`);
  } else { console.error('usage: scripts/r11-baseline.ts render | report [--fake] (see the head of the file)'); process.exit(2); }
}
