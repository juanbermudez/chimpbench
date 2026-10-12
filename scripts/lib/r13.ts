// Stage R13 (docs/staging/r13-prereg.md): what the registration fixes, as constants and pure rules, so that the
// population script (scripts/r10-night.ts), the report (scripts/r13-report.ts), the run script (scripts/r13-run.sh) and
// the tests read one definition. Nothing here runs anything.
import { DRY_SEED, SEALED_SEEDS, type EngineArm } from '../r11-loop';

export const R13 = {
  /** The fresh world seed (prereg §4): never run before this stage, by anything. */
  seed: 3613,
  /** The model arm's length (prereg §5): at most this many simulated days, within this many hours of wall time; the level is read from this many whole days on. */
  days: 20, hours: 9, minDays: 9,
  /** The adapter (prereg §2) and the sha256 of its weights file as read on 12 October 2026; the run refuses other bytes under that name. */
  adapter: 'r11-p5b-s7', sha256: '582e409abd2e91a8016b41bcc5ffbbf59616080313e3ebb67b8c92a2aa04c74c',
  /** The arm of stage R11's loop for each decode the rule of prereg §3 can name. */
  arms: { draw: 'p5b-s7-draw-1', top: 'p5b-s7-top' },
  /** Readout V2 (prereg §8.1): nights in a nest may not fall below the rules' mean by more than D, or by this share when D is smaller (the eight re-draws may all sit at 1). A harness threshold; design assumption. */
  nestFloor: 0.01,
} as const;
/** Weights this stage registered by hash: an adapter of this name with other bytes is refused. */
export const REGISTERED_SHA256: Record<string, string> = { [R13.adapter]: R13.sha256 };
export const isRegisteredArm = (name: string): boolean => name === R13.arms.draw || name === R13.arms.top;

/**
 * Why a seed may not carry a population run, or '' (beside the reserved and retired seeds, which the script refuses
 * first): the sealed pair of stages R7 and R11 for every arm; for an arm of stage R11 with a real adapter every seed but
 * the one this stage registers; for its dry arms (a fake worker that holds no model) every seed but the dry run's.
 */
export function populationSeedRefusal(seed: number, arm: Pick<EngineArm, 'name' | 'adapter'> | null): string {
  if (SEALED_SEEDS.includes(seed)) return `seed ${seed} stays sealed (docs/staging/r7-prereg.md §9, docs/staging/r11-prereg.md §5)`;
  if (!arm) return '';
  if (arm.adapter === 'fake') return seed === DRY_SEED ? '' : `the dry arm ${arm.name} (a fake worker, no model) runs on seed ${DRY_SEED} only: no kernel decides on another seed before its registered run (docs/staging/r13-prereg.md §4)`;
  return seed === R13.seed ? '' : `arm ${arm.name} runs on a population only on the registered seed ${R13.seed} (docs/staging/r13-prereg.md §4); a run on another seed needs its own registration`;
}

export type N1 = 'met' | 'not met' | 'not read';
export interface DecodeRule { decode: 'draw' | 'top'; arm: string; n1: N1; /** Stage R11's S0 on the line of the decode that runs: the two trainings of P5b differ by more than 2 D on a timing row. */ s0: 'yes' | 'no' | 'not read'; why: string }
/**
 * The decode of the registered run (prereg §3), from stage R11's generated numbers file (r11-numbers.md, written by
 * scripts/r11-report.ts): a draw (decode salt 1) only if the line "N1 for the recipe P5b" reads MET; the top pick if it
 * reads NOT MET, is not read, or the file is not there. Nothing else of that file enters the choice; S0 is read only for
 * the tables' heading.
 */
export function decodeRule(r11Numbers: string | null): DecodeRule {
  const line = (r11Numbers ?? '').split('\n').find(l => l.startsWith('- **N1 for the recipe P5b:')) ?? '';
  const said = line.replace('- **N1 for the recipe P5b:', '').trim();
  const n1: N1 = said.startsWith('MET') ? 'met' : said.startsWith('NOT MET') ? 'not met' : 'not read';
  const decode = n1 === 'met' ? 'draw' : 'top';
  // S0 under the heading of the decode that runs ("### Decode `top` (read first)", "### Decode `draw` (the second line)")
  const part = (r11Numbers ?? '').split(/^### Decode `/m).find(x => x.startsWith(`${decode}\``)) ?? '';
  const s0line = part.split('\n').find(l => l.startsWith('- **S0, training-seed spread swamps everything:')) ?? '';
  const s0said = s0line.replace('- **S0, training-seed spread swamps everything:', '').trim();
  const s0 = s0said.startsWith('YES') ? 'yes' : s0said.startsWith('no.') || s0said.startsWith('no*') ? 'no' : 'not read';
  return { decode, arm: R13.arms[decode], n1, s0,
    why: r11Numbers === null ? 'stage R11\'s numbers file is not on hand: N1 is not read, so the top pick runs' : n1 === 'met' ? 'N1 is met for the recipe P5b: a draw from the adapter\'s odds, decode salt 1' : n1 === 'not met' ? 'N1 is not met for the recipe P5b: the top pick' : 'N1 is not read for the recipe P5b (an arm it needs is not on file): the top pick' };
}
