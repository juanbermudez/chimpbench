// Stage R10 (docs/staging/r10-prereg.md §2), wired to stage R9 at the merge of 11 October 2026: the night's decode is
// stage R9's, and nothing of it is defined here. How the applied option is taken from a kernel's probabilities is
// src/kernel/decode.ts (`top`: the kernel's own pick; `draw`: one seeded draw per ask; `held`: a draw whose noise is
// held for an epoch); what an epoch is, and the record every ask logs, is scripts/lib/decoder.ts. The night passes the
// decoder's step to the loop (src/kernel/loop.ts answerWaiting), writes the record it returns on the receipt as `dec`
// (the fields the arms of stage R9 log) and saves the decoder's notes in every checkpoint, so a run in any of the three
// modes resumes and replays exactly. This file only reads the command line's setting and says why one cannot run.
//
// Nothing is fitted: a setting is a mode, a salt and an epoch rule (tests/r9-decode.test.ts asserts the decode has no
// other knob).
import { DECODE_MODES, type DecodeMode } from '../../src/kernel/decode';
import { HOLDS, type HarnessDecode, type Hold } from './decoder';

export { DECODE_MODES, type DecodeMode };

/** The salt a mode runs with when none is named: 0 for the top pick (it draws nothing), 1 for a draw (stage R9's first salt). */
export const defaultSalt = (mode: DecodeMode): number => mode === 'top' ? 0 : 1;

/**
 * Why a decode setting cannot run; '' when it can. `activityFirst`: the world's kinds-first menu switch. A held draw
 * does not hold under it (the review of stage R9, docs/staging/r9-prereg.md §10.4 item 2: the key noted for an applied
 * kind never equals the animal's act, so every ask opens a new epoch and `held` would silently be a fresh draw), so the
 * two are refused together rather than run as something else.
 */
export function decodeRefusal(mode: string, o: { hold?: string; salt?: number; activityFirst?: number } = {}): string {
  if (!(DECODE_MODES as readonly string[]).includes(mode)) return `unknown decode mode "${mode}" (${DECODE_MODES.join(', ')})`;
  if (o.hold !== undefined && !(HOLDS as readonly string[]).includes(o.hold)) return `unknown epoch rule "${o.hold}" (--hold ${HOLDS.join(' | ')})`;
  if (o.salt !== undefined && !(Number.isInteger(o.salt) && o.salt >= 0)) return '--decode-salt is a whole number, 0 or more';
  if (mode === 'held' && (o.activityFirst ?? 0) !== 0) return `decode "held" cannot run with the kinds-first menu (activityFirst ${o.activityFirst}): a held draw does not hold there, every ask would open a new epoch and draw afresh (docs/staging/r9-prereg.md §10.4). Run it with activityFirst 0, or use --decode draw`;
  return '';
}

/** The night's decode setting from its flags (checked with decodeRefusal first). */
export function nightDecode(mode: DecodeMode, salt: number = defaultSalt(mode), hold: Hold = 'act'): HarnessDecode { return { mode, salt, hold }; }

const HOLD_WORDS: Record<Hold, string> = { act: 'held for the act', block: 'held for the half hour', whole: 'held for the whole act, through interrupts (exploratory)' };
/** A setting in words, for the registry and the reports. */
export function decodeWords(spec: HarnessDecode | null | undefined): string {
  if (!spec) return 'none (no decode step: the kernel\'s own pick is applied)';
  return spec.mode === 'top' ? 'top (the kernel\'s own pick)' : spec.mode === 'draw' ? `draw (one seeded draw per ask, salt ${spec.salt})` : `held (a draw ${HOLD_WORDS[spec.hold]}, salt ${spec.salt})`;
}
