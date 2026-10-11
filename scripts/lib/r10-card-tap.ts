// The timing card of stage R7 (scripts/lib/timing-card.ts; docs/staging/r7-prereg.md §3) as a tap of a population
// night's replay (stage R10; the hook scripts/lib/r10-run.ts Tap left for it). The card reads the replayed world after
// each tick's answers have been applied, as an engine arm of stage R7 is read, on every animal aged `minAge` or over at
// the start of the window (unit P of scripts/r7-card.ts). It reads only: the replay's day hashes would say otherwise.
//
//   pnpm exec tsx scripts/r10-night.ts replay <out>            # the card is read by default (--no-card leaves it out)
//   pnpm exec tsx scripts/r10-night.ts replay <out> --no-card --taps scripts/lib/r10-card-tap.ts   # the same, through the hook by hand
//
// Values only. Whether an engine differs from the rules, and in which direction, is read against the control arms of
// stage R7 at the same unit (scripts/r7-report.ts --engine); this tap gives one arm's card, no comparison.
import { cardCounts, cardFinish, cardStart, cardStep, cardSummary, type CardResult, type CardState } from './timing-card';
import type { Registry, Tap } from './r10-run';

/** What the tap leaves in replay.json under `card`: who was read, how much lies under the readouts, one value per readout, and the card itself. */
export interface CardReadout { minAge: number; counts: Record<string, number>; summary: Record<string, number | null>; card: CardResult }

export default function cardTap(reg: Pick<Registry, 'minAge'>): Tap {
  let st: CardState | null = null;
  return {
    name: 'card',
    start(w) { st = cardStart(w, w.chimps.filter(c => c.alive && c.age >= reg.minAge).map(c => c.id)); },
    tick(w) { if (st) cardStep(st, w); },
    end(): CardReadout | null {
      if (!st) return null;
      const card = cardFinish(st);
      return { minAge: reg.minAge, counts: cardCounts([card]), summary: cardSummary([card]), card };
    },
  };
}
