// Stage R13 (docs/staging/r13-prereg.md): what the registration fixes, as constants and pure rules, so that the
// population script (scripts/r10-night.ts), the report (scripts/r13-report.ts), the run script (scripts/r13-run.sh) and
// the tests read one definition. Nothing here runs anything.
import { DRY_SEED, SEALED_SEEDS, type EngineArm } from '../r11-loop';

export const R13 = {
  /** The fresh world seed (prereg §4): never run before this stage, by anything. */
  seed: 3613,
  /** The model arm's length (prereg §5): at most this many simulated days, within this many hours of wall time; the level is read from this many whole days on. */
  days: 20, hours: 9, minDays: 9,
  /** The world of the run (prereg §2): the field map, the working base, this many days of burn-in on the rules. */
  profile: 'field', paramsFile: 'docs/staging/integrator-kit/params/M6-W50.json', burnIn: 30,
  /** The step (prereg §2): one call at a time, this many seconds at most, then the rules and a new worker. */
  timeoutS: 120,
  /** The adapter (prereg §2) and the sha256 of its weights file as read on 12 October 2026; the run refuses other bytes under that name. */
  adapter: 'r11-p5b-s7', sha256: '582e409abd2e91a8016b41bcc5ffbbf59616080313e3ebb67b8c92a2aa04c74c',
  /** The arm of stage R11's loop for each decode the rule of prereg §3 can name. */
  arms: { draw: 'p5b-s7-draw-1', top: 'p5b-s7-top' },
  /** Readout V2 (prereg §8.1): nights in a nest may not fall below the rules' mean by more than D, or by this share when D is smaller (the eight re-draws may all sit at 1). A harness threshold; design assumption. */
  nestFloor: 0.01,
} as const;
/**
 * The arm file of the exact check of the instrument (the review's amendment A1, prereg §13): stage R7's own code
 * (scripts/r7-card.ts runArm) on the rules world with no salt, which is the world the paired rules arm of the night script
 * continues. It is not one of the eight re-draws and enters no spread.
 */
export const PLAIN_RULES = 'rules-plain';
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
  // (the review's amendment A3, prereg §13: before it every arm of stage R11's loop was accepted on the registered seed, so another adapter or decode could have spent it)
  if (!isRegisteredArm(arm.name)) return `arm ${arm.name} is not registered for a population run: stage R13 registers ${R13.arms.draw} or ${R13.arms.top}, whichever its decode rule names (docs/staging/r13-prereg.md §2, §3); another adapter, packet or decode on a population needs its own registration`;
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
  // a dry run's table (scripts/r11-report.ts --dry: a fake worker's arms under the recipe's names, "DRY RUN" in its title) is no table of stage R11: nothing is read from it
  const dry = /DRY RUN/.test((r11Numbers ?? '').split('\n', 1)[0]);
  if (dry) r11Numbers = '';
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
    why: dry ? 'the file is the table of a dry run (a fake worker that holds no model): N1 is not read, so the top pick runs' : r11Numbers === null ? 'stage R11\'s numbers file is not on hand: N1 is not read, so the top pick runs' : n1 === 'met' ? 'N1 is met for the recipe P5b: a draw from the adapter\'s odds, decode salt 1' : n1 === 'not met' ? 'N1 is not met for the recipe P5b: the top pick' : 'N1 is not read for the recipe P5b (an arm it needs is not on file): the top pick' };
}

/**
 * Why a registered arm may not start as asked, or '' (the review's amendments A3 and A4, prereg §13). The decode is read
 * from stage R11's table and never chosen, so the table must be on hand and name this arm; and the world and the length
 * are the registered ones (prereg §2, §5, §6), so that neither can be chosen at the launch. `rule` null: R13_R11_NUMBERS
 * is not set or names no file.
 */
export function registeredRunRefusal(x: { arm: string; profile: string; burnInDays: number; paramsFile: string; days: number; hours: number | null; stopCheck: boolean; timeoutS?: number; contexts?: boolean }, rule: DecodeRule | null): string {
  if (!rule) return `arm ${x.arm}: the decode is read from stage R11's table, never chosen. Set R13_R11_NUMBERS to its generated r11-numbers.md, written after its second night (docs/staging/r13-prereg.md §3; scripts/r13-run.sh decode prints what it says)`;
  if (rule.arm !== x.arm) return `the decode rule names arm ${rule.arm} (${rule.why}); arm ${x.arm} is not the registered run (docs/staging/r13-prereg.md §3)`;
  const off = [x.profile !== R13.profile ? `--profile ${x.profile}` : '', x.burnInDays !== R13.burnIn ? `--burn-in ${x.burnInDays}` : '', x.paramsFile !== R13.paramsFile ? `--params-file ${x.paramsFile}` : '', x.days !== R13.days ? `--days ${x.days}` : '',
    x.hours === null ? 'no --hours' : x.hours > R13.hours ? `--hours ${x.hours}` : '', x.stopCheck ? '' : '--no-stop-check',
    (x.timeoutS ?? R13.timeoutS) !== R13.timeoutS ? `--timeout-s ${x.timeoutS}` : '', x.contexts === false ? '--no-contexts' : ''].filter(Boolean);
  return off.length ? `the registered run is the ${R13.profile} map after ${R13.burnIn} days of burn-in on the working base (${R13.paramsFile}), --days ${R13.days}, --hours ${R13.hours} or less, the stop check on, ${R13.timeoutS} s an ask at most, its contexts saved (docs/staging/r13-prereg.md §2, §5, §6); this call differs: ${off.join(', ')}` : '';
}

/**
 * What is left of the registered run's nine hours at a resume (prereg §5 and the review's amendment A4): the hours are the
 * run's, not each segment's. Counted: the wall time of the whole days on file. `fits`: another day fits them, by the rule
 * the run itself ends on (the mean of the last three days, with a tenth to spare); `hours`: what the resumed segment gets,
 * never more than was asked.
 */
export function resumeBudget(days: { wallSeconds: number }[], asked: number | null): { usedHours: number; hours: number; fits: boolean } {
  const used = days.reduce((s, d) => s + d.wallSeconds, 0), last = days.slice(-3), pace = last.length ? last.reduce((s, d) => s + d.wallSeconds, 0) / last.length : 0, left = R13.hours * 3600 - used;
  return { usedHours: used / 3600, hours: Math.max(0, Math.min(asked ?? Infinity, left / 3600)), fits: left > 0 && used + pace * 1.1 <= R13.hours * 3600 };
}
