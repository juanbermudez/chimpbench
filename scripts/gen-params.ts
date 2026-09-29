// Parameter registry tooling (docs/realism-design.md §4). data/params.json is the human-edited source of truth;
// this script validates it and writes src/sim/params.gen.ts, which hot code imports.
//
//   pnpm exec tsx scripts/gen-params.ts            # validate and regenerate src/sim/params.gen.ts
//   pnpm exec tsx scripts/gen-params.ts --check    # validate; fail if the generated file is stale; run the literal lint
//   pnpm exec tsx scripts/gen-params.ts --lint     # only the evidence-tagged literal lint over src/sim
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY_PATH = join(ROOT, 'data/params.json');
export const GEN_PATH = join(ROOT, 'src/sim/params.gen.ts');

export const GROUPS = ['scale', 'perception', 'movement', 'needs', 'feeding', 'social', 'dominance', 'conflict', 'territory', 'patrol', 'hunting',
  'prey', 'phenology', 'weather', 'reproduction', 'mortality', 'disease', 'communication', 'memory', 'decision', 'observer'] as const;
export const EVIDENCE = ['H', 'M', 'L', 'design', 'stylized', 'calibrated', 'assumed'] as const;
/**
 * Where a plausible range comes from. Calibration treats anything but `source` as a weak prior (C4 review):
 * `assumed-x2` is the default ÷2..×2 band, `assumed-pm2h` ±2 h around an hour of day, `assumed` another hand-set band,
 * `placeholder-pm10` a ±10% band around a planned value (not an uncertainty interval), `fixed` a constant.
 */
export const RANGE_BASES = ['source', 'assumed-x2', 'assumed-pm2h', 'assumed', 'placeholder-pm10', 'fixed'] as const;

export interface Entry {
  id: string; group: string; value: number; units: string; range: [number, number]; hardRange: [number, number];
  /** Where `range` comes from (RANGE_BASES). */
  rangeBasis: string;
  /** Why calibration must never move this entry (for example it only affects rendering). */
  calibrationExcluded?: string;
  /** docs/research.md studies without a source key that support an H/M/L value. */
  refs?: string[];
  calibrate: boolean; prior?: { dist: 'uniform' | 'loguniform' | 'normal' | 'beta'; [k: string]: unknown };
  evidence: string; sources: string[]; population?: string; years?: string; clock: 'eco' | 'bio' | 'none';
  symbol: string | null; file: string | null; profiles?: { compressed?: number; field?: number };
  /** Parameter constraints (P-* in docs/realism-design.md §2) attached to this entry. */
  constraints?: string[];
  /** Stage that will add the mechanism; planned entries are documented but not generated into DEFAULTS. */
  planned?: string;
  /** Why the default sits outside the source range (a known misfit or a stylization). */
  outOfRange?: string;
  integer?: boolean; calibratedBy?: string; notes: string;
}
export interface Registry { version: number; about: string; params: Entry[] }

export function loadRegistry(path = REGISTRY_PATH): Registry { return JSON.parse(readFileSync(path, 'utf8')) as Registry; }

/** Every problem with the registry, as plain sentences; empty when valid. */
export function validateRegistry(reg: Registry, sourceKeys?: Set<string>, constraintIds?: Set<string>): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const ids = reg.params.map(p => p.id);
  if (ids.join() !== [...ids].sort().join()) errors.push('params must be sorted by id');
  const inR = (v: number, r: [number, number]) => v >= r[0] && v <= r[1];
  const attached = new Map<string, string>();
  for (const p of reg.params) {
    const e = (m: string) => errors.push(`${p.id}: ${m}`);
    if (!/^[a-z][A-Za-z0-9]*$/.test(p.id)) e('id must be camelCase');
    if (seen.has(p.id)) e('duplicate id');
    seen.add(p.id);
    if (!(GROUPS as readonly string[]).includes(p.group)) e(`unknown group ${p.group}`);
    if (!(EVIDENCE as readonly string[]).includes(p.evidence)) e(`unknown evidence ${p.evidence}`);
    // an evidence level needs a verified source (a key in data/targets.json or a docs/research.md reference)
    if (['H', 'M', 'L'].includes(p.evidence) && !(p.sources?.length) && !(p.refs?.length)) e(`evidence ${p.evidence} without a source or research.md reference (use "assumed")`);
    if (!(RANGE_BASES as readonly string[]).includes(p.rangeBasis)) e(`unknown rangeBasis ${p.rangeBasis}`);
    if (p.rangeBasis === 'fixed' && p.hardRange?.[0] !== p.hardRange?.[1]) e('rangeBasis fixed needs a degenerate hardRange');
    if (p.calibrationExcluded && p.calibrate) e('calibrationExcluded entries cannot be calibrated');
    if (typeof p.value !== 'number' || !Number.isFinite(p.value)) e('value must be a finite number');
    for (const [name, r] of [['range', p.range], ['hardRange', p.hardRange]] as const)
      if (!Array.isArray(r) || r.length !== 2 || !r.every(Number.isFinite) || r[0] > r[1]) e(`${name} must be [lo, hi]`);
    if (Array.isArray(p.hardRange) && !inR(p.value, p.hardRange)) e('value outside hardRange');
    if (Array.isArray(p.range) && Array.isArray(p.hardRange) && (p.range[0] < p.hardRange[0] || p.range[1] > p.hardRange[1])) e('range must lie inside hardRange');
    const field = p.profiles?.field;
    const checked = field !== undefined ? field : p.value;
    if (Array.isArray(p.range) && !inR(checked, p.range) && !p.outOfRange) e(`${field !== undefined ? 'field-profile value' : 'value'} outside range without an outOfRange note`);
    for (const v of Object.values(p.profiles ?? {})) if (!inR(v, p.hardRange)) e('profile value outside hardRange');
    if (p.integer && (!Number.isInteger(p.value) || Object.values(p.profiles ?? {}).some(v => !Number.isInteger(v)))) e('integer parameter with a fractional value');
    if (p.calibrate && !p.prior) e('calibrate needs a prior');
    if (!['eco', 'bio', 'none'].includes(p.clock)) e('clock must be eco, bio or none');
    if (!Array.isArray(p.sources)) e('sources must be a list');
    else if (sourceKeys) for (const s of p.sources) if (!sourceKeys.has(s)) e(`unknown source ${s}`);
    if (!p.notes) e('notes are required');
    if (p.planned) { if (p.symbol !== null || p.file !== null) e('planned entries have no symbol or file'); }
    else if (!p.symbol || !p.file) e('symbol and file are required');
    for (const c of p.constraints ?? []) {
      if (constraintIds && !constraintIds.has(c)) e(`unknown constraint ${c}`);
      if (attached.has(c)) e(`constraint ${c} is also attached to ${attached.get(c)}`);
      attached.set(c, p.id);
    }
  }
  if (constraintIds) for (const c of constraintIds) if (!attached.has(c)) errors.push(`constraint ${c} is not attached to any entry`);
  return errors;
}

const num = (v: number) => (Object.is(v, -0) ? '0' : String(v));

/** The generated TypeScript for the non-planned entries. Deterministic text, so drift is a string comparison. */
export function generate(reg: Registry): string {
  const live = reg.params.filter(p => !p.planned);
  const hash = createHash('sha256').update(JSON.stringify(live.map(p => [p.id, p.value, p.hardRange, p.profiles ?? null, p.integer ?? false]))).digest('hex').slice(0, 16);
  const lines = [
    '// Generated by scripts/gen-params.ts from data/params.json. Do not edit; run `pnpm exec tsx scripts/gen-params.ts`.',
    '/* eslint-disable */',
    `export const REGISTRY_VERSION = ${reg.version};`,
    '/** Content hash of every live default, hard range, profile value and integer flag. Stored with each world. */',
    `export const REGISTRY_HASH = '${hash}';`,
    '',
    '/** Registry defaults (the compressed profile). */',
    'export const DEFAULTS = {',
    ...live.map(p => `  ${p.id}: ${num(p.value)},`),
    '} as const;',
    '',
    'export type ParamId = keyof typeof DEFAULTS;',
    '',
    '/** Physical or logical limits; overrides outside them are rejected. */',
    'export const HARD_RANGES: { readonly [K in ParamId]: readonly [number, number] } = {',
    ...live.map(p => `  ${p.id}: [${num(p.hardRange[0])}, ${num(p.hardRange[1])}],`),
    '};',
    '',
    '/** Parameters that must stay whole numbers. */',
    `export const INTEGER_IDS: readonly ParamId[] = [${live.filter(p => p.integer).map(p => `'${p.id}'`).join(', ')}];`,
    '',
    '/** Scale-profile values that differ from DEFAULTS (docs/realism-design.md §5.1). */',
    'export const PROFILE_VALUES: { readonly compressed: Partial<Record<ParamId, number>>; readonly field: Partial<Record<ParamId, number>> } = {',
    `  compressed: { ${live.filter(p => p.profiles?.compressed !== undefined && p.profiles.compressed !== p.value).map(p => `${p.id}: ${num(p.profiles!.compressed!)}`).join(', ')} },`,
    `  field: { ${live.filter(p => p.profiles?.field !== undefined).map(p => `${p.id}: ${num(p.profiles!.field!)}`).join(', ')} },`,
    '};',
    '',
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Lint: numeric literals next to an evidence tag must come from the registry
// ---------------------------------------------------------------------------

// Any pairing ([M-H], [M/H], [L–M], ...) and the noun forms: docs already use [M/H], which the first version missed.
const TAG = /\[(?:H|M|L)(?:[-–/](?:H|M|L))?(?:[:\]\s]|$)|\bdesign\b|\bstyli[sz](?:ed|ation)\b|\bassum(?:ed|ption)\b/i;
/** Structural numbers allowed anywhere: identities, time conversions, rounding. */
const ALLOWED = new Set(['0', '1', '2', '24', '60', '100', '180', '360', '1000', '3600', '365', '365.25', '1e9', '1e-9', '1e-6', '1e-3', '1e12']);
/** Life-stage boundaries (lifeStage: infant < 5, juvenile < 10, adolescent < 15, adult < 40; adolescents from 12 act as adults) are contract definitions. */
const STAGE_AGES = new Set(['5', '10', '12', '15', '40']);

function stripCode(line: string, inBlock: { v: boolean }): { code: string; comment: string } {
  let code = '', comment = '', i = 0;
  while (i < line.length) {
    if (inBlock.v) { const end = line.indexOf('*/', i); if (end < 0) { comment += line.slice(i); return { code, comment }; } comment += line.slice(i, end); i = end + 2; inBlock.v = false; continue; }
    const ch = line[i], nx = line[i + 1];
    if (ch === '/' && nx === '/') { comment += line.slice(i + 2); break; }
    if (ch === '/' && nx === '*') { inBlock.v = true; i += 2; continue; }
    if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch; i++;
      while (i < line.length && line[i] !== q) i += line[i] === '\\' ? 2 : 1;
      i++; code += '""'; continue;
    }
    code += ch; i++;
  }
  return { code, comment };
}

/** Removes hash01(...) calls: their literal arguments are hash salts (stream identities), not parameters. */
function stripHashes(code: string): string {
  let out = '', i = 0;
  for (;;) {
    const at = code.indexOf('hash01(', i);
    if (at < 0) return out + code.slice(i);
    out += code.slice(i, at) + 'h';
    let depth = 0, j = at + 6;
    for (; j < code.length; j++) { if (code[j] === '(') depth++; else if (code[j] === ')' && --depth === 0) break; }
    i = j + 1;
  }
}

/** Numeric literals in a code fragment, with stage-age comparisons, hash salts and centred draws (U - 0.5) removed. */
function literals(code: string): string[] {
  const noAges = stripHashes(code).replace(/\b(random\(world\)|h)\s*-\s*0\.5\b/g, '$1')
    .replace(/\bage\s*(?:>=|<=|>|<|===)\s*(\d+)\b/g, (m, n: string) => (STAGE_AGES.has(n) ? '' : m));
  const out: string[] = [];
  for (const m of noAges.matchAll(/(?<![\w.$])(\d+(?:\.\d+)?(?:e-?\d+)?|\.\d+)(?![\w$])/g)) if (!ALLOWED.has(m[1])) out.push(m[1]);
  return out;
}

export interface LintHit { file: string; line: number; literals: string[]; text: string }

/**
 * Lines next to an evidence tag ([H], [M], [L], [M-H], [M/L], design, stylized, assumed) whose code still carries a
 * numeric literal: the tag line's own code, or, for a comment-only tag line, the next code line and its continuation.
 */
export function lintSim(dir = join(ROOT, 'src/sim')): LintHit[] {
  const hits: LintHit[] = [];
  for (const name of readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'params.gen.ts').sort()) {
    const lines = readFileSync(join(dir, name), 'utf8').split('\n');
    const inBlock = { v: false };
    const parsed = lines.map(l => stripCode(l, inBlock));
    for (let i = 0; i < lines.length; i++) {
      if (!TAG.test(parsed[i].comment) || /lint-ok:/.test(parsed[i].comment)) continue;
      const region: number[] = [];
      if (parsed[i].code.trim()) region.push(i);
      else {
        let j = i + 1;
        while (j < lines.length && !parsed[j].code.trim()) j++;
        while (j < lines.length) {
          region.push(j);
          if (!/[,(+\-*/&|?:=]\s*$/.test(parsed[j].code.trimEnd()) || j - i > 6) break;
          j++;
        }
      }
      for (const k of region) {
        const lit = literals(parsed[k].code);
        if (lit.length) hits.push({ file: `src/sim/${name}`, line: k + 1, literals: lit, text: lines[k].trim().slice(0, 160) });
      }
    }
  }
  return hits;
}

function main(): void {
  const args = process.argv.slice(2);
  const targets = JSON.parse(readFileSync(join(ROOT, 'data/targets.json'), 'utf8')) as { sources: Record<string, unknown>; parameterConstraints: { id: string }[] };
  if (args.includes('--lint')) { report(lintSim()); return; }
  const reg = loadRegistry();
  const errors = validateRegistry(reg, new Set(Object.keys(targets.sources)), new Set(targets.parameterConstraints.map(c => c.id)));
  if (errors.length) { console.error(`data/params.json: ${errors.length} problem(s)\n  ${errors.join('\n  ')}`); process.exit(1); }
  const text = generate(reg);
  if (args.includes('--check')) {
    const current = readFileSync(GEN_PATH, 'utf8');
    if (current !== text) { console.error('src/sim/params.gen.ts is stale: run `pnpm exec tsx scripts/gen-params.ts`'); process.exit(1); }
    const hits = lintSim();
    report(hits);
    if (hits.length) process.exit(1);
    console.log(`data/params.json valid (${reg.params.length} entries, ${reg.params.filter(p => p.planned).length} planned); params.gen.ts up to date; lint clean`);
    return;
  }
  writeFileSync(GEN_PATH, text);
  console.log(`wrote src/sim/params.gen.ts (${reg.params.filter(p => !p.planned).length} live parameters)`);
}

function report(hits: LintHit[]): void {
  for (const h of hits) console.log(`${h.file}:${h.line}  [${h.literals.join(', ')}]  ${h.text}`);
  console.log(`${hits.length} evidence-tagged line(s) with literals outside the registry`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
