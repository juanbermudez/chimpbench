// Stage RW bench (docs/staging/rw-bench-prereg.md §2 and §4): from the scan file to wild choices, and the seal.
// The held-out part is sealed: without an explicit opening its rows are blanked at load (scripts/rw-ngogo-choices.ts
// seal) and no choice of it can be built. Opening writes a line to a committed log BEFORE any outcome is read.
// Privacy: a WildChoice holds animal codes and session keys; nothing here writes one to a committed file.
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import type { WildChoice } from '../../src/rw/packet';
import { PART_RULE, parseCsv, partOf, prepare, score, toRows, type Part, type Row } from '../rw-ngogo-choices';

export const SEALED_LOG = 'docs/staging/rw-sealed-log.md';
export const CSV = 'data/raw/dryad-sf7m0cgkg/chimp_behav_data.csv';

/**
 * The eligible choices of one part, in the parser's record order, each with what preceded its decision scan.
 * `opened` must be true for the held-out part and is ignored for the others (their history never includes a held-out
 * session). `history` 'open' gives held-out records history from train and development sessions only.
 */
export function wildChoices(rows: Row[], part: Part, opts: { opened?: boolean; history?: 'all' | 'open' } = {}): WildChoice[] {
  if (part === 'held-out' && opts.opened !== true) throw new Error('the held-out part is sealed (docs/staging/rw-prereg.md §2): it opens only with --open-sealed <reason>');
  const { roster, otherPartSameDay, sessions } = prepare(rows, part === 'held-out'), out: WildChoice[] = [];
  score(sessions, roster, otherPartSameDay, {
    feeds: part === 'held-out' && opts.history === 'open' ? s => partOf({ code: s.focal, year: s.year }) !== 'held-out' : undefined,
    onEligible(r, v) {
      if (r.part !== part) return;
      const inSet = (a: string[]) => [...new Set(a)].filter(c => v.set.includes(c)), prev = v.prev;
      const near2 = prev ? inSet(prev.prox2) : [];
      // bouts of this session that ended before the previous scan, most recent first
      const past = v.earlier.filter(x => x.end < r.scan - 1).sort((a, b) => b.end - a.end);
      const counts = (f: (b: string) => number) => Object.fromEntries(v.set.map(b => [b, f(b)]));
      out.push({ key: `${r.session}#${r.scan}`, focal: r.focal, part: r.part, partStratum: r.partStratum, preceded: r.stratum, set: [...v.set], labels: r.maleLabels.filter(l => v.set.includes(l)),
        prev: prev ? { near2, near5: inSet(prev.prox5).filter(c => !near2.includes(c)), groomedBy: inSet(prev.receives), iGroomed: inSet(prev.gives), grooming: inSet(prev.dyads.flatMap(d => [d.from, d.to])) } : null,
        earlier: { iGroomed: inSet(past.filter(x => x.from === r.focal).map(x => x.to)), groomedBy: inSet(past.filter(x => x.to === r.focal).map(x => x.from)) },
        given: counts(v.given), received: counts(v.received), near: counts(v.near), base: { ...r.base } });
    },
  });
  return out;
}

/** Writes the opening of the sealed part to the log, before anything is read. A reason of fewer than 12 characters is refused. */
export function logOpening(reason: string, kernels: string[], commit: string, log = SEALED_LOG, now = new Date()): string {
  const why = (reason ?? '').trim().replace(/\s+/g, ' ').replace(/\|/g, '/');
  if (why.length < 12 || why.startsWith('--')) throw new Error('--open-sealed needs a reason (a sentence: who decided, for which registered evaluation)');
  const line = `| ${now.toISOString().slice(0, 10)} | ${why} | ${kernels.join(', ')} | ${commit} |`;
  appendFileSync(log, line + '\n');
  return line;
}

export const readRows = (csv = CSV): Row[] => toRows(parseCsv(readFileSync(csv, 'utf8')));
/** Fingerprints for a manifest (prereg §8): the records used and the split rule. No key is written anywhere. */
export const recordIdsHash = (choices: WildChoice[]) => createHash('sha256').update(choices.map(c => c.key).sort().join('\n')).digest('hex');
export const splitRuleHash = () => createHash('sha256').update(PART_RULE).digest('hex');
