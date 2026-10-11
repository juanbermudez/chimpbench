// Stage R8, the wording test, prepared for the integrator (docs/staging/r8-prereg.md §7). It re-renders the saved
// held-out records of stage R4 two ways, so the adapter that exists can be scored on both and the difference read:
//   state    today's state-only packet (scripts/lib/packet-state.ts), rebuilt from the saved context and checked
//            against the saved packet, option for option;
//   neutral  the same state lines without `urgent`, each option as its neutral label (the act, its target and the
//            animal's belief words: no reason sentence, no purpose phrase), and the one-sentence instruction.
// Nothing else differs between the two. The saved contexts were sampled before observeV5 existed, so they carry none of
// the animal's own experience; what each option is comes from scripts/lib/r8-about.ts.
// The records are read from stage R4's folder and never written there; the output goes to a gitignored folder here.
//
//   pnpm exec tsx scripts/r8-rerender.ts [--contexts <R4 contexts dir>] [--out artifacts/r8/rerender]
// Then, with the model (the integrator; one model process at a time):
//   MGOGO_FT_ROOT=<folder holding adapters/r4-rules-state> training/decide_ft/r4_py.sh em_score.py --in <out>/all.jsonl \
//     --packets state,neutral --provider r4-rules-state --out <out>/all.r4-rules-state.jsonl
//   pnpm exec tsx scripts/r8-wording-report.ts --dir <out> --provider r4-rules-state [--saved <R4 eval dir>/all.r4-rules-state.jsonl]
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { neutralized, rulesWordings, type LocalPacket } from '../server/decide';
import { OWN_INSTRUCTION } from '../src/kernel/packet-own';
import { buildStateOnlyQuestion, removedWordingsIn, tokensOf } from './lib/packet-state';
import { withAboutFromReason } from './lib/r8-about';
import type { R4Rec } from './r4-contexts';
import { R4_CONTEXTS } from './r8-wording-probe';

/** The two renderings of one saved record (it must carry its context), and whether today's packet was rebuilt exactly. */
export function rerender(rec: R4Rec): { state: LocalPacket; neutral: LocalPacket; rebuilt: boolean } {
  if (!rec.context) throw new Error(`record ${rec.id} carries no context`);
  const state = buildStateOnlyQuestion(rec.context);
  return { state, neutral: neutralized(withAboutFromReason(rec.context, rec.options), state), rebuilt: JSON.stringify(state) === JSON.stringify(rec.packet) };
}

/** Phrases of the rules' wording found in a packet's text (src/providers/packet.ts rulesWordings, and the state-only packet's own removed list). */
export function leakedIn(packet: LocalPacket): string[] {
  const text = JSON.stringify(packet), W = rulesWordings();
  return [...W.purposes.filter(p => text.includes(p)), ...W.urgent.filter(u => text.includes(u)), ...W.instructions.filter(s => text.includes(s)), ...removedWordingsIn(packet)];
}

/** Stage R4's evaluation ids: the second decision of one animal in one tick gets a suffix, in file order (scripts/r4-evalset.ts). */
export function uniqueIds<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Map<string, number>();
  return rows.map(r => { const n = (seen.get(r.id) ?? 0) + 1; seen.set(r.id, n); return n === 1 ? r : { ...r, id: `${r.id}~${n}` }; });
}

if (process.argv[1]?.endsWith('r8-rerender.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const dir = resolve(arg('contexts', R4_CONTEXTS)), out = resolve(arg('out', 'artifacts/r8/rerender')), file = `${dir}/test.jsonl`;
  if (out.startsWith(dir)) throw new Error('the output must not be inside the folder that is read');
  const raw = readFileSync(file, 'utf8'), recs = uniqueIds(raw.split('\n').filter(Boolean).map(l => JSON.parse(l) as R4Rec));
  const all: { id: string; packets: Record<string, LocalPacket> }[] = [], test: unknown[] = [];
  let rebuilt = 0, leaks = 0, urgent = 0, changed = 0, options = 0;
  const tok = { state: [] as number[], neutral: [] as number[] };
  for (const r of recs) {
    const p = rerender(r);
    rebuilt += +p.rebuilt;
    if (!p.rebuilt) throw new Error(`record ${r.id}: today's state-only packet is not the saved one; the builder has changed`);
    const found = leakedIn(p.neutral);
    leaks += found.length;
    if (found.length) throw new Error(`record ${r.id}: the neutral packet carries the rules' wording (${found.join(' | ')})`);
    if (p.neutral.questions.action.instructions !== OWN_INSTRUCTION) throw new Error('instruction');
    urgent += +(p.state.state.urgent !== undefined);
    for (const k of Object.keys(p.state.questions.action.criteria)) { options++; changed += +(p.state.questions.action.criteria[k] !== p.neutral.questions.action.criteria[k]); }
    tok.state.push(tokensOf(p.state)); tok.neutral.push(tokensOf(p.neutral));
    const { context: _context, packet: _packet, packets: _packets, ...row } = r;
    test.push({ ...row, packets: { state: p.state, neutral: p.neutral } });
    all.push({ id: r.id, packets: { state: p.state, neutral: p.neutral } });
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/test.jsonl`, test.map(r => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(`${out}/all.jsonl`, all.map(r => JSON.stringify(r)).join('\n') + '\n');
  const med = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
  const manifest = { stage: 'R8', what: 'the wording test: stage R4\'s held-out records rendered as today\'s state-only packet and with neutral options', source: file, sourceSha256: createHash('sha256').update(raw).digest('hex'),
    records: recs.length, draws: recs.filter(r => r.draw).length, packets: ['state', 'neutral'],
    checks: { stateRebuiltEqualsSaved: `${rebuilt} of ${recs.length}`, rulesWordingInNeutral: leaks, optionsReworded: `${changed} of ${options}`, urgentLineRemovedFrom: urgent },
    tokensEstimate: { state: { median: med(tok.state), max: Math.max(...tok.state) }, neutral: { median: med(tok.neutral), max: Math.max(...tok.neutral) } },
    limits: 'The saved contexts carry none of the animal\'s own experience (no doing, asked, lately or last line); a joined trip\'s leader is "a companion".',
    next: 'score all.jsonl with the existing adapter on both packets (training/decide_ft/em_score.py), then scripts/r8-wording-report.ts' };
  writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1) + '\n');
  console.log(JSON.stringify(manifest, null, 1));
}
