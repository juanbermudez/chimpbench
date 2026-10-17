// Stage R16 (docs/staging/r16-prereg.md §5, §6, §10): the collection and the files, no model.
//
//   census --seed 48|7|21 --out DIR [--days 10] [--burn-in 30]       a rules world's census, a checkpoint a day (resumes)
//   select --dir DIR --plan zero|heldOut                              the registered selection, from the census alone (written once)
//   labels --dir DIR [--day D]                                        the label pass, one day segment at a time (each lands on the census hash; resumes)
//   learner-select --run DIR --plan one|evalLearner [--exclude FILE]  a roll-out's selection from its own census (training animals; or development animals, H-L)
//   assemble-zero --out OUT                                           ft0 (round zero), eval/hr.jsonl, eval/hs.jsonl
//   assemble-one --out OUT                                            ft1 (round one, equal exposure), eval/hl.jsonl
//   tokens-input --out OUT                                            eval/token-packets.jsonl for training/decide_ft/r8_tokens.py (the tokenizer alone)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeAtomic } from './lib/checkpoint';
import { exposure as _e, readRows, writeReadingSet, writeTrainingRoot } from './lib/r16-assemble';
import { labelRulesDay, PLANS, R16, readCensus, readJsonl, readLabels, readSelection, rulesCensus, select, selectionDigest, type CensusEntry, type Selected } from './lib/r16-collect';

void _e;
const git = (...a: string[]) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const log = (s: string) => console.log(`[${new Date().toLocaleTimeString('en-GB', { hour12: false })}] ${s}`);

export function collectMain(argv: string[]): number {
  const [cmd] = argv, flag = (k: string, d = '') => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; }, has = (k: string) => argv.includes(`--${k}`);
  const dry = has('dry');
  if (!dry && git('status', '--porcelain')) { console.error('refused: the collection runs from a committed, clean checkout'); return 2; }
  if (cmd === 'census') {
    const seed = +flag('seed'), out = resolve(flag('out')), burnInDays = +flag('burn-in', String(R16.burnInDays)), days = +flag('days', String(R16.days));
    if (![48, 7, 21].includes(seed)) { console.error('refused: the census runs on 48 and 7 (training, development) and 21 (the held-out rules set) only'); return 2; }
    if (!dry && (burnInDays !== R16.burnInDays || days !== R16.days)) { console.error(`refused: the registered census is ${R16.burnInDays} days of burn-in and ${R16.days} days`); return 2; }
    rulesCensus(out, seed, { days, burnInDays, commit: git('rev-parse', 'HEAD'), log });
    return 0;
  }
  if (cmd === 'select') {
    const dir = resolve(flag('dir')), plan = flag('plan') as 'zero' | 'heldOut', file = resolve(dir, 'selection.jsonl');
    if (!PLANS[plan]) { console.error('refused: --plan zero|heldOut'); return 2; }
    const { doc, entries } = readCensus(dir);
    if ((plan === 'heldOut') !== (doc.seed === 21)) { console.error('refused: seed 21 is selected by the held-out plan only, and the held-out plan selects seed 21 only'); return 2; }
    const sel = select(entries, PLANS[plan]);
    if (existsSync(file)) { const was = readSelection(dir); if (selectionDigest(was) !== selectionDigest(sel)) { console.error(`refused: ${file} holds another selection`); return 2; } log(`${file}: on file and the same`); return 0; }
    writeAtomic(file, sel.map(s => JSON.stringify(s)).join('\n') + '\n');
    const by: Record<string, number> = {}; for (const s of sel) by[`${s.split}:${s.via}`] = (by[`${s.split}:${s.via}`] ?? 0) + 1;
    writeAtomic(resolve(dir, 'selection.meta.json'), JSON.stringify({ stage: 'R16', plan, seed: doc.seed, census: entries.length, selected: sel.length, by, digest: selectionDigest(sel) }, null, 1) + '\n');
    log(`seed ${doc.seed}: ${sel.length} decisions selected (${JSON.stringify(by)})`);
    return 0;
  }
  if (cmd === 'labels') {
    const dir = resolve(flag('dir')), { doc } = readCensus(dir), sel = readSelection(dir), want = new Map(sel.map(s => [s.id, s]));
    const days = flag('day') ? [+flag('day')] : doc.days.map(d => d.day);
    for (const d of days) labelRulesDay(dir, doc.seed, d, want, { burnInDays: doc.burnInDays, log });
    return 0;
  }
  if (cmd === 'learner-select') {
    const run = resolve(flag('run')), plan = flag('plan') as 'one' | 'evalLearner', out = resolve(run, plan === 'one' ? 'selection.jsonl' : 'selection-hl.jsonl');
    const entries = readJsonl<CensusEntry>(resolve(run, 'census.jsonl')), exclude = new Set(flag('exclude') ? readJsonl<Selected>(resolve(flag('exclude'))).map(s => s.id) : []);
    if (!entries.length || entries.some(e => e.source !== 'learner' || ![48, 7].includes(e.seed))) { console.error('refused: a learner selection reads a roll-out on 48 or 7'); return 2; }
    const sel = select(entries, PLANS[plan], exclude);
    if (existsSync(out)) { if (selectionDigest(readJsonl<Selected>(out)) !== selectionDigest(sel)) { console.error(`refused: ${out} holds another selection`); return 2; } return 0; }
    writeAtomic(out, sel.map(s => JSON.stringify(s)).join('\n') + '\n');
    log(`${run}: ${sel.length} asks selected by the ${plan} plan`);
    return 0;
  }
  if (cmd === 'assemble-zero') {
    const out = resolve(flag('out')), commit = git('rev-parse', 'HEAD');
    const zero = [48, 7].map(s => ({ file: resolve(out, 'collect', `s${s}`, 'labels'), rows: readLabels(resolve(out, 'collect', `s${s}`)) }));
    const m = writeTrainingRoot(resolve(out, 'ft0'), 'zero', zero, commit);
    const hr = writeReadingSet(resolve(out, 'eval', 'hr.jsonl'), 'hr', [{ file: resolve(out, 'collect', 's21', 'labels'), rows: readLabels(resolve(out, 'collect', 's21')) }]);
    const hsIn = [48, 7].map(s => resolve(out, 'hs', `s${s}`, 'hs.jsonl')).filter(existsSync);
    const hs = hsIn.length ? writeReadingSet(resolve(out, 'eval', 'hs.jsonl'), 'hs', hsIn.map(f => ({ file: f, rows: readRows(f) }))) : null;
    writeAtomic(resolve(out, 'eval', 'manifest-zero.json'), JSON.stringify({ stage: 'R16', ft0: m.counts, hr, hs: hs ?? 'H-S was dropped or not made' }, null, 1) + '\n');
    log(`ft0: ${JSON.stringify(m.counts)}; held-out rules set ${hr.rows} rows (${hr.animals} animals); H-S ${hs ? `${hs.rows} rows` : 'none'}`);
    return 0;
  }
  if (cmd === 'assemble-one') {
    const out = resolve(flag('out')), commit = git('rev-parse', 'HEAD'), z = JSON.parse(readFileSync(resolve(out, 'ft0', 'contexts', 'manifest.json'), 'utf8')) as { counts: { train: number } };
    const zeroRows = ['train', 'dev'].map(s => ({ file: resolve(out, 'ft0', 'contexts', `${s}.jsonl`), rows: readRows(resolve(out, 'ft0', 'contexts', `${s}.jsonl`)) }));
    const learner = [48, 7].map(s => resolve(out, 'rollout', `s${s}`, 'labels.jsonl')).filter(existsSync).map(f => ({ file: f, rows: readRows(f) }));
    if (learner.length !== 2) { console.error('refused: round one needs both roll-outs labelled'); return 2; }
    const m = writeTrainingRoot(resolve(out, 'ft1'), 'agg', [...zeroRows, ...learner], commit, { roundZeroTrain: z.counts.train });
    const hlIn = [48, 7].map(s => resolve(out, 'rollout', `s${s}`, 'labels-hl.jsonl')).filter(existsSync);
    const hl = hlIn.length ? writeReadingSet(resolve(out, 'eval', 'hl.jsonl'), 'hl', hlIn.map(f => ({ file: f, rows: readRows(f) }))) : null;
    writeAtomic(resolve(out, 'eval', 'manifest-one.json'), JSON.stringify({ stage: 'R16', ft1: m.counts, exposure: m.exposure, hl }, null, 1) + '\n');
    log(`ft1: ${JSON.stringify(m.counts)}; exposure ${JSON.stringify(m.exposure)}`);
    return 0;
  }
  if (cmd === 'tokens-input') {
    const out = resolve(flag('out')), sets = ['hr', 'hs', 'hl'].map(s => resolve(out, 'eval', `${s}.jsonl`)).filter(existsSync);
    const rows = sets.flatMap(f => readRows(f)).map(r => ({ id: r.id, packets: { r15: r.packet } }));
    writeAtomic(resolve(out, 'eval', 'token-packets.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
    log(`eval/token-packets.jsonl: ${rows.length} packets of ${sets.length} reading sets`);
    return 0;
  }
  console.error('usage: r16-collect.ts census | select | labels | learner-select | assemble-zero | assemble-one | tokens-input');
  return 2;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { try { process.exitCode = collectMain(process.argv.slice(2)); } catch (e) { console.error(e instanceof Error ? e.stack ?? e.message : e); process.exitCode = 1; } }
