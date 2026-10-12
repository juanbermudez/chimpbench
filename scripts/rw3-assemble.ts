// Stage RW3 (Track R; docs/staging/rw3-prereg.md §2 and §7): the training file of the small Taï adapters
// (`rw3-tai-groom-s7`, `-s11`), from the TRAIN part of the Taï first-grooming-partner record and nothing else.
//
//   pnpm exec tsx scripts/rw3-assemble.ts [--dir artifacts/rw2] [--out artifacts/decide-ft/rw3] [--manifest data/rw2-manifest.json]
//       [--history-check artifacts/rw3/history-check.json] [--json artifacts/rw3/dry-counts.json]
//
// A row's packet is the scorer's own: buildRw2Question on the request buildRw2Packet makes (src/rw2/packet.ts), with the
// seed and the own view scripts/rw2-score.ts uses, so training and scoring see the same words. Epoch k shows every
// record once under shuffle k. A menu wider than 8 is cut, as in stage R4 (scripts/r4-wild.ts), to a seeded sub-menu of 8
// that contains the adult actually groomed, built by the fan-out wrapper's own narrowRw2Request.
// The development part is never a source of a row: of that part only the record keys and the flag that says whether a
// record is scored are read, for the leak check. No sealed part is read: an opened sealed file beside the records is a
// refusal. Every leak check of prereg §7 runs on each build and stops it on a failure.
// Privacy: rows hold invented names and a hashed record key; the file and its manifest stay under artifacts/ (gitignored).
// What is printed is aggregate counts only.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { FAN_WIDTH } from '../src/kernel/fanout';
import { estimateInputTokens, type LocalPacket } from '../src/providers/packet';
import { compromisedFor, manifestError, type KernelManifest } from '../src/rw/manifest';
import { shuffled, streamOf } from '../src/rw/packet';
import { buildRw2Packet, buildRw2Question, narrowRw2Request, RW2_SEED, RW2_VERSION, rw2RequestError, type Rw2Record } from '../src/rw2/packet';
import { compromisedLists } from '../src/rw2/score';

export const RW3_LABEL_SOURCE = 'field choices, Tai first grooming partner';   // the name data/rw-compromised.json keys on
export const RW3_ADAPTER = 'rw3-tai-groom';
export const RW3_DATASET = 'tai-groom' as const;
export const RW3_RESULT_NAME = 'Taï-taught adapter on the Taï record\'s own menu';
/** The registered recipe (prereg §3): stage R4's field adapter, copied; the last epoch is saved (no checkpoint is chosen). */
export const RW3_RECIPE = { epochs: 4, lr: 2e-4, batch: 2, accum: 4, r: 16, alpha: 32, dropout: 0.05, checkpointing: 0, top_layers: 8, amp: 'bf16' } as const;
export const RW3_SEEDS = [7, 11] as const;
/** The registered budget on the server's token estimate (stage RW's, which the scorer passes to the GLiNER kernel). */
export const RW3_TOKEN_BUDGET = 1200;
/** Measured seconds per training example on this computer: stage R4's field adapter (0.408) and stage R11's smoke run (0.6). */
export const TRAIN_SECONDS = [0.41, 0.6] as const;

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
/** The reader's own fingerprint of a set of records (scripts/rw2/rw2_ingest.py keys_hash): sha256 of the sorted keys, one per line. */
export const keysHash = (keys: string[]) => sha([...keys].sort().join('\n'));
const quant = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y), p = (s.length - 1) * q, lo = Math.floor(p); return s.length ? s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (p - lo) : NaN; };
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export interface Rw3Row { id: string; key: string; part: 'train'; epoch: number; setSize: number; shown: number; packet: LocalPacket; pick: string }

/** A record this stage may teach from: an eligible record of the Taï train part with exactly one adult groomed first. */
export function teachable(record: Rw2Record): string {
  if (record.dataset !== RW3_DATASET) return 'another record than Taï grooming';
  if (record.part !== 'train') return `a record of the ${record.part} part`;
  if (!record.eligible) return 'a record left out of every score';
  if (record.labels.length !== 1) return 'not exactly one adult groomed first';
  return '';
}

/**
 * One training row: the record's packet under shuffle `k` in the own view, cut to a seeded sub-menu of `width` around
 * the adult actually groomed when the menu is wider. Null when the packet is over the token budget (counted, dropped).
 */
export function rw3Row(record: Rw2Record, k: number, width = FAN_WIDTH): Rw3Row | null {
  const bad = teachable(record);
  if (bad) throw new Error(`rw3: ${bad} cannot be a training row`);
  const full = buildRw2Packet(record, { seed: RW2_SEED, shuffle: k, view: 'own' }), n = full.request.options.length, label = full.labels[0];
  let request = full.request, pick = label;
  if (n > width) {
    // the rest of the sub-menu and its order come from the record's own seeded streams (the `sample` stream does not vary with the shuffle, so k is in the key)
    const others = shuffled(full.request.options.map((_, i) => i).filter(i => i !== label), streamOf(RW2_SEED, k, 'sample', `rw3-sub:${k}:${record.key}`)).slice(0, width - 1);
    const positions = shuffled([label, ...others], streamOf(RW2_SEED, k, 'sample', `rw3-order:${k}:${record.key}`));
    request = narrowRw2Request(full.request, positions);
    pick = positions.indexOf(label);
  }
  const wrong = rw2RequestError(request);
  if (wrong) throw new Error(`rw3: a training packet failed the record's own validation: ${wrong}`);
  const packet = buildRw2Question(request);
  if (estimateInputTokens(packet.state, packet.questions) > RW3_TOKEN_BUDGET) return null;
  return { id: `${sha(record.key).slice(0, 16)}-k${k}`, key: record.key, part: 'train', epoch: k, setSize: n, shown: request.options.length, packet, pick: `c${pick}` };
}

/** Every row of the training file: each teachable record once per epoch, in the records' order. `dropped`: rows over the token budget. */
export function rw3Rows(train: Rw2Record[], epochs: number = RW3_RECIPE.epochs): { rows: Rw3Row[]; dropped: number } {
  const rows: Rw3Row[] = [];
  let dropped = 0;
  for (const record of train) {
    if (teachable(record)) continue;
    for (let k = 0; k < epochs; k++) { const row = rw3Row(record, k); if (row) rows.push(row); else dropped++; }
  }
  return { rows, dropped };
}

/** The Taï block of data/rw2-manifest.json, as far as this stage reads it. */
export interface TaiManifest { splitRule: { sha256: string }; parts: Record<'train' | 'development', { eligible: number; eligibleKeysSha256: string }> }
export interface LeakReport {
  ok: boolean; failures: string[];
  trainRecords: number; trainKeysSha256: string; manifestTrainSha256: string | null;
  developmentKeys: number; developmentKeysSha256: string; manifestDevelopmentSha256: string | null;
  rows: number; rowsSharedWithDevelopment: number; rowsNotOfTheTrainPart: number; recordsWithoutEveryEpoch: number;
  rowsNotTheBuilders: number; labelMovedChangesThePacket: number; packetsNamingAKeyOrChooser: number; picksNotOnTheirLabel: number;
  firstOptionShare: number; firstOptionExpected: number; sealedFileOnHand: boolean;
}

/**
 * The leak checks 1 to 4 of prereg §7 on a built file. `train`: every record of the train file (eligible or not);
 * `development`: of that part only the key and the eligible flag; `manifest`: the committed counts and hashes, or null
 * (then the comparison with it is a failure unless `allowNoManifest`, which only tests pass).
 */
export function leakCheck(rows: Rw3Row[], train: Rw2Record[], development: { key: string; eligible: boolean }[], manifest: TaiManifest | null,
  o: { epochs?: number; dropped?: number; sealedFileOnHand?: boolean; allowNoManifest?: boolean } = {}): LeakReport {
  const epochs = o.epochs ?? RW3_RECIPE.epochs, failures: string[] = [];
  const teach = train.filter(r => !teachable(r)), byKey = new Map(teach.map(r => [r.key, r])), devKeys = new Set(development.map(d => d.key));
  const trainHash = keysHash(teach.map(r => r.key)), devHash = keysHash(development.filter(d => d.eligible).map(d => d.key));
  // 1. only the registered train records, each once per epoch
  const notTrain = rows.filter(r => r.part !== 'train' || !byKey.has(r.key)).length;
  if (notTrain) failures.push(`${notTrain} rows are not of an eligible record of the train part`);
  if (new Set(rows.map(r => r.id)).size !== rows.length) failures.push('two rows share an id');
  const seen = new Map<string, Set<number>>();
  for (const r of rows) (seen.get(r.key) ?? seen.set(r.key, new Set()).get(r.key)!).add(r.epoch);
  const short = teach.filter(r => (seen.get(r.key)?.size ?? 0) !== epochs).length;
  if (rows.length + (o.dropped ?? 0) !== teach.length * epochs || rows.some(r => !Number.isInteger(r.epoch) || r.epoch < 0 || r.epoch >= epochs)) failures.push('the rows are not one per record per epoch');
  if (short && !(o.dropped ?? 0)) failures.push(`${short} records are not shown in every epoch`);
  if (!manifest) { if (!o.allowNoManifest) failures.push('no committed manifest to compare the record keys with'); }
  else {
    if (manifest.parts.train.eligibleKeysSha256 !== trainHash || manifest.parts.train.eligible !== teach.length) failures.push('the train records on hand are not the registered ones (count or key hash differs from the committed manifest)');
    if (manifest.parts.development.eligibleKeysSha256 !== devHash) failures.push('the development keys on hand are not the registered ones (their hash differs from the committed manifest)');
  }
  // 2. no development key
  const shared = rows.filter(r => devKeys.has(r.key)).length;
  if (shared) failures.push(`${shared} rows carry a development key`);
  if (teach.some(r => devKeys.has(r.key))) failures.push('a train record and a development record share a key');
  // 3. no sealed record is ever on hand
  if (o.sealedFileOnHand) failures.push('an opened sealed file lies beside the records: this stage does not run beside it');
  // 4. the label is not in the words
  let moved = 0, named = 0, off = 0, first = 0, expected = 0, foreign = 0;
  for (const record of teach) {
    const other = { ...record, labels: [(record.labels[0] + 1) % record.options.length] };
    for (let k = 0; k < epochs; k++) {
      const a = buildRw2Packet(record, { seed: RW2_SEED, shuffle: k, view: 'own' }), b = buildRw2Packet(other, { seed: RW2_SEED, shuffle: k, view: 'own' });
      if (JSON.stringify(buildRw2Question(a.request)) !== JSON.stringify(buildRw2Question(b.request))) moved++;
    }
  }
  for (const r of rows) {
    const record = byKey.get(r.key), text = JSON.stringify(r.packet), criteria = r.packet.questions.action.criteria;
    if (!record) continue;
    // the row is the builder's own, word for word: nothing was written into it afterwards
    if (JSON.stringify(rw3Row(record, r.epoch)) !== JSON.stringify(r)) foreign++;
    if (text.includes(record.key) || text.includes(record.chooser)) named++;
    // the pick is the option that names the adult actually groomed: read again from the record, by the invented name
    const full = buildRw2Packet(record, { seed: RW2_SEED, shuffle: r.epoch, view: 'own' }), name = full.request.context.social[full.labels[0]].name;
    if (Object.keys(criteria).length !== r.shown || criteria[r.pick] !== `Groom ${name}`) off++;
    first += +(r.pick === 'c0'); expected += 1 / r.shown;
  }
  if (foreign) failures.push(`${foreign} rows are not the rows the builder makes from their records`);
  if (moved) failures.push(`${moved} packets change when the label is moved to another option`);
  if (named) failures.push(`${named} packets hold a record key or a chooser's label`);
  if (off) failures.push(`${off} rows do not pick the adult actually groomed`);
  return { ok: !failures.length, failures, trainRecords: teach.length, trainKeysSha256: trainHash, manifestTrainSha256: manifest?.parts.train.eligibleKeysSha256 ?? null,
    developmentKeys: development.length, developmentKeysSha256: devHash, manifestDevelopmentSha256: manifest?.parts.development.eligibleKeysSha256 ?? null,
    rows: rows.length, rowsSharedWithDevelopment: shared, rowsNotOfTheTrainPart: notTrain, recordsWithoutEveryEpoch: short, rowsNotTheBuilders: foreign, labelMovedChangesThePacket: moved, packetsNamingAKeyOrChooser: named, picksNotOnTheirLabel: off,
    firstOptionShare: rows.length ? r3(first / rows.length) : 0, firstOptionExpected: rows.length ? r3(expected / rows.length) : 0, sealedFileOnHand: !!o.sealedFileOnHand };
}

/** Aggregate counts of a built file (prereg §12): records, choosers, menu sizes, token estimates, steps and the projected training time. */
export function rw3Counts(rows: Rw3Row[], train: Rw2Record[], dropped: number, epochs: number = RW3_RECIPE.epochs) {
  const teach = train.filter(r => !teachable(r)), perChooser = new Map<string, number>(), sizes: Record<string, number> = {}, shown: Record<string, number> = {};
  for (const r of teach) { perChooser.set(r.chooser, (perChooser.get(r.chooser) ?? 0) + 1); sizes[r.options.length] = (sizes[r.options.length] ?? 0) + 1; }
  for (const r of rows) shown[r.shown] = (shown[r.shown] ?? 0) + 1;
  const counts = [...perChooser.values()], tokens = rows.map(r => estimateInputTokens(r.packet.state, r.packet.questions));
  const perEpoch = Array.from({ length: epochs }, (_, k) => rows.filter(r => r.epoch === k).length), steps = perEpoch.map(n => Math.ceil(n / (RW3_RECIPE.batch * RW3_RECIPE.accum)));
  const total = steps.reduce((a, b) => a + b, 0), leftOut: Record<string, number> = {};
  for (const r of train) { const why = r.eligible ? teachable(r) : r.why || 'not eligible'; if (why) leftOut[why] = (leftOut[why] ?? 0) + 1; }
  return {
    recordsWrittenByTheReader: train.length, records: teach.length, leftOut, choosers: perChooser.size,
    recordsPerChooser: { min: Math.min(...counts), median: quant(counts, 0.5), max: Math.max(...counts), largestShare: r3(Math.max(...counts) / teach.length) },
    byChooserSex: { male: teach.filter(r => r.focal.sex === 'm').length, female: teach.filter(r => r.focal.sex === 'f').length },
    chance: r3(teach.reduce((a, r) => a + 1 / r.options.length, 0) / teach.length),
    menuSizes: sizes, menu: { median: quant(teach.map(r => r.options.length), 0.5), max: Math.max(...teach.map(r => r.options.length)) }, widerThan8: teach.filter(r => r.options.length > FAN_WIDTH).length,
    epochs, rows: rows.length, rowsPerEpoch: perEpoch, optionsShown: shown, droppedRowsOverTheTokenBudget: dropped,
    tokensEstimate: { median: Math.round(quant(tokens, 0.5)), p90: Math.round(quant(tokens, 0.9)), max: Math.max(...tokens), mean: Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length) },
    optimiserSteps: { perEpoch: steps, total, warmUp: Math.max(1, Math.floor(0.1 * total)) },
    trainingMinutesOneSeed: TRAIN_SECONDS.map(s => Math.round(rows.length * s / 6) / 10),
  };
}

/** Reads a part's derived records. The development part is read through `developmentKeys`, never through this. */
export function readTrain(dir: string): Rw2Record[] {
  const file = `${dir}/${RW3_DATASET}/records-train.jsonl`;
  if (!existsSync(file)) throw new Error(`no derived records at ${file}: run /usr/bin/python3 -I scripts/rw2/rw2_ingest.py first (or copy a frozen checkout's artifacts/rw2)`);
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Rw2Record);
}
/** Of the development part: each record's key and whether it is scored. Nothing else of a line is kept. */
export function developmentKeys(dir: string): { key: string; eligible: boolean }[] {
  const file = `${dir}/${RW3_DATASET}/records-development.jsonl`;
  if (!existsSync(file)) throw new Error(`no derived records at ${file}`);
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => { const r = JSON.parse(l) as Rw2Record; if (r.part !== 'development') throw new Error('the development file holds a record of another part'); return { key: r.key, eligible: r.eligible }; });
}
export const sealedOnHand = (dir: string) => existsSync(`${dir}/${RW3_DATASET}/records-sealed.jsonl`);
/** An output folder must lie under a folder named artifacts (git-ignored): nothing of this stage's data can land in a tracked place. */
export const underArtifacts = (path: string) => resolve(path).split(sep).includes('artifacts');

if (process.argv[1]?.endsWith('rw3-assemble.ts')) {
  const A = process.argv, arg = (k: string, d: string) => { const i = A.indexOf(`--${k}`); return i > 0 ? A[i + 1] : d; };
  try {
    if (A.some(a => /sealed/i.test(a))) throw new Error('this stage takes no sealed part (docs/staging/rw3-prereg.md §1)');
    const dir = arg('dir', 'artifacts/rw2'), out = resolve(arg('out', 'artifacts/decide-ft/rw3')), manifestFile = arg('manifest', 'data/rw2-manifest.json'), historyFile = arg('history-check', '');
    if (!underArtifacts(out)) throw new Error(`--out must lie under a folder named artifacts (${out})`);
    if (sealedOnHand(dir)) throw new Error(`an opened sealed file lies under ${dir}: this stage does not run beside it`);
    const train = readTrain(dir), development = developmentKeys(dir);
    const committed = (JSON.parse(readFileSync(manifestFile, 'utf8')) as { datasets: Record<string, TaiManifest> }).datasets[RW3_DATASET];
    const { rows, dropped } = rw3Rows(train), leak = leakCheck(rows, train, development, committed, { dropped, sealedFileOnHand: false });
    if (!leak.ok) throw new Error(`leak check failed: ${leak.failures.join('; ')}`);
    // leak check 5 (the chooser's own future), run where the dates are: scripts/rw3/rw3_history_check.py
    const history = historyFile && existsSync(historyFile) ? JSON.parse(readFileSync(historyFile, 'utf8')) as { ok: boolean } : null;
    if (history && !history.ok) throw new Error('the history check failed: a later outcome reaches an earlier record');
    const counts = rw3Counts(rows, train, dropped), teach = train.filter(r => !teachable(r));
    const lists = compromisedLists(JSON.parse(readFileSync('data/rw-compromised.json', 'utf8'))), mine = lists.find(l => l.labelSource === RW3_LABEL_SOURCE);
    if (!mine) throw new Error(`data/rw-compromised.json holds no list for "${RW3_LABEL_SOURCE}"`);
    const kernel: KernelManifest = { name: RW3_ADAPTER, kind: 'adapter', baseModel: 'fastino/GLiNER2.5-Decide', labelSources: [RW3_LABEL_SOURCE], part: 'train', records: teach.length,
      recordIdsHash: leak.trainKeysSha256, splitRuleHash: committed.splitRule.sha256, packet: { version: RW2_VERSION, seed: RW2_SEED, shuffles: Array.from({ length: RW3_RECIPE.epochs }, (_, k) => k) },
      created: new Date().toISOString().slice(0, 10), commit: execSync('git rev-parse --short HEAD').toString().trim() };
    const wrong = manifestError(kernel);
    if (wrong) throw new Error(`manifest: ${wrong}`);
    mkdirSync(`${out}/tai`, { recursive: true });
    const text = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
    writeFileSync(`${out}/tai/train.jsonl`, text);
    const manifest = { stage: 'RW3', label_source: RW3_LABEL_SOURCE, name_of_results: RW3_RESULT_NAME,
      label_note: 'Labels are the adult a wild Taï chimpanzee groomed first among the adults in sight, in a session it started (the train part of stage RW2\'s record; Mielke et al. 2018). Hard labels. Small, named and separate: never the main label source, never in the simulation\'s loop without a further registered stage (docs/staging/rw3-prereg.md §9).',
      input: `stage RW2's packet ${RW2_VERSION}, own view (src/rw2/packet.ts buildRw2Question), unchanged; menus wider than ${FAN_WIDTH} cut to seeded sub-menus of ${FAN_WIDTH} that contain the adult actually groomed`,
      kernel, registered: { recipe: RW3_RECIPE, seeds: RW3_SEEDS, savedEpoch: 'the last (no checkpoint is chosen)', labels: 'hard' },
      trainFile: 'tai/train.jsonl', trainFileSha256: sha(text),
      part: { name: 'train', recordsWritten: train.length, records: teach.length, choosers: counts.choosers, recordIdsHash: leak.trainKeysSha256 },
      trainedOn: { records: teach.length, choosers: counts.choosers, widerThan8: counts.widerThan8, rows: rows.length, epochs: RW3_RECIPE.epochs },
      droppedRowsOverTheTokenBudget: dropped, developmentPartRead: 'record keys and the eligible flag only, for the leak check', sealedPartRead: false,
      leakCheck: leak, historyCheck: history ?? 'not run (no raw files linked): scripts/rw3-run.sh dry runs it when data/raw is linked', counts,
      compromised_targets: [...compromisedFor(kernel, mine).keys()], flagged_targets: (mine.flagged ?? []).map(f => f.id), compromised_list: 'data/rw-compromised.json (src/rw/manifest.ts compromisedFor), as docs/staging/rw2-prereg.md §2.7 proposes, until the user rules otherwise' };
    writeFileSync(`${out}/tai/data-manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
    const printed = { trainFile: `${out}/tai/train.jsonl`, counts, leakCheck: { ...leak, failures: leak.failures.length }, historyCheck: history ?? 'not run', compromised: manifest.compromised_targets, flagged: manifest.flagged_targets };
    if (arg('json', '')) writeFileSync(arg('json', ''), JSON.stringify(printed, null, 1) + '\n');
    console.log(JSON.stringify(printed, null, 1));
  } catch (e) { console.error(`rw3-assemble: ${e instanceof Error ? e.message : e}`); process.exit(1); }
}
