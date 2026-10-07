// Stage R4 (docs/staging/r4-prereg.md §2 b): the training file of the field adapter `r4-field-groom`, from the TRAIN part
// of the wild-choice benchmark (whom a wild adult male groomed; src/rw, scripts/lib/rw-load.ts). The input is the
// benchmark's own wild packet (scripts/lib/rw-serialize.ts buildWildQuestion), unchanged. A menu wider than 8 is cut to a
// seeded sub-menu of 8 that contains the groomed male, built by the fan-out wrapper's own narrowWildRequest, so a
// training sub-menu has the form of a fan-out sub-request. Each epoch deals a new option order and a new sub-menu.
// The development part is never read here; the held-out part is sealed and cannot be (rw-load refuses it).
// Privacy: rows hold pseudonyms and a hashed record id only; the file stays under artifacts/ (gitignored).
//
//   pnpm exec tsx scripts/r4-wild.ts [--epochs 4] [--out artifacts/decide-ft/r4/field]
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { estimateInputTokens, type LocalPacket } from '../server/decide';
import { FAN_WIDTH } from '../src/kernel/fanout';
import { manifestError, type KernelManifest } from '../src/rw/manifest';
import { buildWildPacket, DEFAULT_SEED, narrowWildRequest, PACKET_VERSION, shuffled, streamOf, wildRequestError, type WildChoice } from '../src/rw/packet';
import { CSV, readRows, recordIdsHash, splitRuleHash, wildChoices } from './lib/rw-load';
import { buildWildQuestion, WILD_TOKEN_BUDGET } from './lib/rw-serialize';

export const FIELD_LABEL_SOURCE = 'field choices, Ngogo male grooming';   // the name data/rw-compromised.json keys on
/** Focal males of the train part whose hash is below this are the adapter's validation set (prereg §3). */
export const VAL_SHARE = 0.15;
const u01 = (text: string) => createHash('sha256').update(text).digest().readUInt32BE(0) / 2 ** 32;
export const isValidationMale = (focal: string) => u01(`r4-field-val:${focal.trim().toLowerCase()}`) < VAL_SHARE;

export interface WildRow { id: string; split: 'train' | 'val'; epoch: number; setSize: number; shown: number; packet: LocalPacket; pick: string }

/** One training row: the record's packet under shuffle `k`, cut to a sub-menu of `width` around the groomed male when wider. */
export function wildRow(choice: WildChoice, k: number, width = FAN_WIDTH): Omit<WildRow, 'split'> | null {
  const full = buildWildPacket(choice, { seed: DEFAULT_SEED, shuffle: k }), n = full.request.options.length;
  if (!full.labels.length) return null;
  // one label per row: the first partner in option order (records with two partners at one scan are rare)
  const label = full.labels[0];
  let request = full.request, pick = label;
  if (n > width) {
    // the other partners are never distractors; the rest of the sub-menu and its order come from the record's own seeded stream
    const others = shuffled(full.request.options.map((_, i) => i).filter(i => !full.labels.includes(i)), streamOf(DEFAULT_SEED, k, 'sample', `r4-sub:${k}:${choice.key}`)).slice(0, width - 1);
    const positions = shuffled([label, ...others], streamOf(DEFAULT_SEED, k, 'sample', `r4-order:${k}:${choice.key}`));
    request = narrowWildRequest(full.request, positions);
    pick = positions.indexOf(label);
  }
  const bad = wildRequestError(request);
  if (bad) throw new Error(`a training packet failed the wild validation: ${bad}`);
  const packet = buildWildQuestion(request);
  if (estimateInputTokens(packet.state, packet.questions) > WILD_TOKEN_BUDGET) return null;
  return { id: `${createHash('sha256').update(choice.key).digest('hex').slice(0, 16)}-k${k}`, epoch: k, setSize: n, shown: request.options.length, packet, pick: `c${pick}` };
}

if (process.argv[1]?.endsWith('r4-wild.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const epochs = +arg('epochs', '4'), out = resolve(arg('out', 'artifacts/decide-ft/r4/field'));
  const choices = wildChoices(readRows(arg('csv', CSV)), 'train');   // the train part only
  const train: WildRow[] = [], val: WildRow[] = [];
  let dropped = 0;
  for (const c of choices) {
    const held = isValidationMale(c.focal);
    // validation rows: shuffle 0 only (one row per record); training rows: one per epoch
    for (let k = 0; k < (held ? 1 : epochs); k++) { const r = wildRow(c, k); if (!r) { dropped++; continue; } (held ? val : train).push({ ...r, split: held ? 'val' : 'train' }); }
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/train.jsonl`, train.map(r => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(`${out}/val.jsonl`, val.map(r => JSON.stringify(r)).join('\n') + '\n');
  const trained = choices.filter(c => !isValidationMale(c.focal)), wide = (rows: WildChoice[]) => rows.filter(c => new Set(c.set).size - +c.set.includes(c.focal) > FAN_WIDTH).length;
  const kernel: KernelManifest = { name: 'r4-field-groom', kind: 'adapter', baseModel: 'fastino/GLiNER2.5-Decide', labelSources: [FIELD_LABEL_SOURCE], part: 'train', records: trained.length,
    recordIdsHash: recordIdsHash(trained), splitRuleHash: splitRuleHash(), packet: { version: PACKET_VERSION, seed: DEFAULT_SEED, shuffles: Array.from({ length: epochs }, (_, k) => k) },
    created: new Date().toISOString().slice(0, 10), commit: execSync('git rev-parse --short HEAD').toString().trim() };
  const bad = manifestError(kernel);
  if (bad) throw new Error(`manifest: ${bad}`);
  const manifest = { stage: 'R4', label_source: FIELD_LABEL_SOURCE,
    label_note: 'Labels are whom wild adult males of Ngogo groomed (the train part of the wild-choice benchmark). Small and separate by the user\'s decision of 6 October 2026.',
    input: `the wild-choice benchmark's packet ${PACKET_VERSION} (scripts/lib/rw-serialize.ts buildWildQuestion), unchanged; menus wider than ${FAN_WIDTH} cut to seeded sub-menus of ${FAN_WIDTH} that contain the groomed male`,
    kernel, part: { name: 'train', records: choices.length, focalMales: new Set(choices.map(c => c.focal)).size, recordIdsHash: recordIdsHash(choices) },
    trainedOn: { records: trained.length, focalMales: new Set(trained.map(c => c.focal)).size, widerThan8: wide(trained), rows: train.length, epochs },
    validation: { records: choices.length - trained.length, focalMales: new Set(choices.filter(c => isValidationMale(c.focal)).map(c => c.focal)).size, rows: val.length, recordIdsHash: recordIdsHash(choices.filter(c => isValidationMale(c.focal))) },
    droppedRowsOverTheTokenBudget: dropped, developmentPartRead: false, heldOutPartRead: false,
    compromised_targets: ['T-SOC-1', 'T-SOC-2', 'T-FIS-1', 'T-FIS-3', 'T-FIS-5'], compromised_list: 'data/rw-compromised.json (src/rw/manifest.ts compromisedFor)' };
  writeFileSync(`${out}/data-manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
  console.log(JSON.stringify({ part: manifest.part.records, trainedOn: manifest.trainedOn, validation: { records: manifest.validation.records, focalMales: manifest.validation.focalMales, rows: val.length }, dropped }, null, 1));
}
