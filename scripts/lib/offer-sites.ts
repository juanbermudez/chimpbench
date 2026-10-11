// Stage R12 (docs/staging/r12-prereg.md §2): what stands in front of every offer() of src/sim/candidates.ts, read from
// the source text. The valuation ledger (scripts/lib/valuation.ts, stage R7) counts the offer sites; this lists, for
// each, the conditions that gate it as they are written: the `if` it stands in, the `else` branches it stands behind,
// the `continue` and `return` guards before it in its blocks, the loops around it, and the same for every place its
// helper function is called from (a parameter is shown as the argument that call passes). A condition that is a local
// name is opened to its definition, so a gate such as `cooled` is shown as the comparison it is. Pure: source text in,
// plain data out. Lexical, on the tokens of the valuation ledger (TypeScript 7 ships no parser a script can call); every
// rule is stated where it is applied so a reader can check any row against its line. Nothing is run.
import { brackets, tokenize, type Tok } from './valuation';

/** A statement of the source, as far as gating needs it. `a`, `b`: first and last token. */
type Node =
  | { k: 'block'; a: number; b: number; body: Node[] }
  | { k: 'if'; a: number; b: number; c0: number; c1: number; then: Node; else?: Node }
  | { k: 'loop'; a: number; b: number; c0: number; c1: number; body: Node }
  | { k: 'fn'; a: number; b: number; name: string; body: Node }
  | { k: 'stmt'; a: number; b: number; jump: boolean; inner: Node[] };

/** A local declaration `const|let name = expr`: the name's token, the expression's token range [a, b), the bracket it stands in. */
interface Def { name: string; tok: number; a: number; b: number; block: number; isLet: boolean; isFn: boolean }
/** A function of the source: its token range (parameters and body) and its parameters' names. */
interface Fn { a: number; b: number; name: string; params: string[] }
/** The arguments one call binds to a function's parameters; `up`: the binding the call itself stands under. */
interface Env { fn: Fn; args: Map<string, [number, number]>; up?: Env }

/**
 * One condition in front of an offer. `text` is the condition as written, followed by the definitions of the local names
 * it reads (` | name := definition`); it is the key a classification is matched by. `how`: 'if' (a conjunct of an
 * enclosing `if`), 'else' (the negation of an earlier branch), 'guard' (the negation of a `continue` or `return` guard
 * before it), 'loop' (the loop it stands in), 'and' (an operand before it in a short-circuit `a && b && f()`).
 * `via`: the local names it was reached through. `numbers`: the number literals in it; `params`: the registry ids it reads.
 */
export interface Atom { text: string; line: number; how: 'if' | 'else' | 'guard' | 'loop' | 'and'; via: string; numbers: string[]; params: string[] }
/** One way an offer is reached: `label` names the call chain ('' for the function that builds the list itself). */
export interface Path { label: string; atoms: Atom[] }
export interface OfferSite {
  /** Stable name: function / action / variants # position among the offers of the same function, action and variants. */
  key: string; line: number; fn: string; action: string;
  /** The names of the variants the call can pass (V.<NAME>; NONE when it passes none), and whether its fifth argument is given. */
  variants: string[]; aux: boolean;
  /** The second and third arguments as written: the target and the score. */
  target: string; score: string;
  paths: Path[];
  /** Where a selected target came from: the conditions around each assignment of a `let` name, or each push to a scratch list, that a gate reads. */
  sources: Path[];
  /** A hash of the action, variants, target and every condition's text: it changes when the gating changes, not when lines move. */
  print: string;
}

const OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const CLOSE = new Set([')', ']', '}']);
const COMPARE = new Set(['===', '!==', '==', '!=', '>=', '<=', '>', '<']);
const FLIP: Record<string, string> = { '===': '!==', '!==': '===', '==': '!=', '!=': '==', '>=': '<', '<': '>=', '<=': '>', '>': '<=' };
const BINARY = new Set(['&&', '||', '?', ':', '??', '+', '-', '*', '/', '%', ...COMPARE]);
/** Names never opened: aliases every line reads, whose definition says nothing about a gate. */
const STOP = new Set(['time', 'hour', 'env', 'px', 'pz', 'pers', 'idx', 'byId', 'world', 'c', 'x', 'P', 'o', 'i', 'k']);
/** A definition that is one call of a predicate is opened too. */
const PREDICATE = /^(maternalKin|dominates|isAdultMale|rankedMale|dependentOn|guardianOf|isCarried|guarded|socialBit|aggrBit|remembersChimp|isTreeId|\w+On)$/;
/** Helpers that read one bit of a registry switch: the number names the bit and is no threshold. */
const SWITCH_FNS = new Set(['socialBit', 'aggrBit', 'callGapOn']);
const WHERE_MAX = 220;

export function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Every offer site of a source text with its gates. `root`: the function that builds the list (its offers have one
 * path; an offer in any other function gets one path per call of that function, followed back to `root`).
 * `offerFn`: the function whose calls with a string action are offer sites.
 */
export function offerSites(src: string, root = 'computeCandidates', offerFn = 'offer'): OfferSite[] {
  const toks = tokenize(src), { parent, close } = brackets(toks);
  const isP = (i: number, s: string) => toks[i]?.t === 'p' && toks[i].s === s;
  const isId = (i: number, s?: string) => toks[i]?.t === 'id' && (s === undefined || toks[i].s === s);
  const openOf = new Int32Array(toks.length).fill(-1);
  for (let i = 0; i < toks.length; i++) if (close[i] >= 0) openOf[close[i]] = i;

  // --- printing ------------------------------------------------------------------------------------------------------
  const valueEnd = (i: number) => !!toks[i] && (toks[i].t !== 'p' || toks[i].s === ')' || toks[i].s === ']');
  /** `!` after a value is a non-null assertion, not a negation. */
  const postfixBang = (i: number) => isP(i, '!') && i > 0 && valueEnd(i - 1) && !isId(i - 1, 'return');
  const unary = (i: number) => (isP(i, '-') || isP(i, '+')) && !(i > 0 && valueEnd(i - 1));
  const show = (k: Tok) => k.t === 'str' ? `'${k.s}'` : k.s;
  /** The tokens [a, b) as one line of text with regular spacing (stable and readable; not meant to compile). */
  const text = (a: number, b: number): string => {
    let out = '';
    for (let i = a; i < b; i++) {
      const k = toks[i];
      if (postfixBang(i)) continue;                                   // `x!` reads as `x`
      const prev = i > a ? toks[i - 1] : undefined, prevBang = i > a && postfixBang(i - 1), pi = prevBang ? i - 2 : i - 1;
      let glue = out === '';
      if (!glue && k.t === 'p' && (k.s === ')' || k.s === ']' || k.s === ',' || k.s === '.' || k.s === '?.' || k.s === ';')) glue = true;
      if (!glue && k.t === 'p' && (k.s === '(' || k.s === '[') && pi >= a && valueEnd(pi) && !['return', 'typeof', 'in', 'of'].includes(toks[pi].s)) glue = true;
      if (!glue && prev && prev.t === 'p' && !prevBang && (prev.s === '(' || prev.s === '[' || prev.s === '.' || prev.s === '?.' || prev.s === '!' || unary(i - 1))) glue = true;
      out += (glue ? '' : ' ') + show(k);
    }
    return out;
  };

  // --- statements ----------------------------------------------------------------------------------------------------
  const defs: Def[] = [], fns: Fn[] = [];
  /** [a, b) split at the top-level occurrences of an operator. */
  const split = (a: number, b: number, op: string): [number, number][] => {
    const out: [number, number][] = [];
    let s = a;
    for (let j = a; j < b; j++) {
      if (toks[j].t === 'p' && OPEN[toks[j].s] && close[j] > 0 && close[j] < b) { j = close[j]; continue; }
      if (isP(j, op)) { out.push([s, j]); s = j + 1; }
    }
    out.push([s, b]);
    return out;
  };
  const paramNames = (open: number): string[] => split(open + 1, close[open], ',').filter(([s, e]) => e > s && isId(s)).map(([s]) => toks[s].s);
  /** The name an arrow function with a block body at `j` is bound to (`const name = (…) => {`) and its parameters. */
  const arrowHead = (j: number): { name: string; params: string[]; a: number } => {
    let name = 'λ', params: string[] = [], a = j;
    if (isId(j - 2) && (isP(j - 3, '(') || isP(j - 3, ',') || isP(j - 3, '='))) { params = [toks[j - 2].s]; a = j - 2; }   // `q => {` (a return type is preceded by `:` or `|`)
    for (let k = j - 2; k >= 0; k--) {
      if (toks[k].t === 'p' && CLOSE.has(toks[k].s) && openOf[k] >= 0) {
        if (isP(k, ')') && parent[k] === parent[j] && !params.length && (isP(k + 1, '=>') || isP(k + 1, ':'))) { params = paramNames(openOf[k]); a = openOf[k]; }
        k = openOf[k]; continue;
      }
      if (parent[k] !== parent[j]) break;
      if (isP(k, '=') && isId(k - 1)) { name = toks[k - 1].s; break; }
      if (isP(k, ';') || isP(k, ',')) break;
    }
    return { name, params, a };
  };
  /** The declarators of a `const` or `let` statement over tokens [i, b]. */
  const declare = (i: number, b: number): void => {
    const p = parent[i], isLet = isId(i, 'let'), parts: [number, number][] = [];
    let s = i + 1;
    for (let j = i + 1; j <= b; j++) {
      if (toks[j].t === 'p' && OPEN[toks[j].s] && close[j] > 0) { j = close[j]; continue; }
      if ((isP(j, ',') || isP(j, ';')) && parent[j] === p) { parts.push([s, j]); s = j + 1; }
    }
    if (s <= b && !isP(b, ';')) parts.push([s, b + 1]);
    let last: Def | null = null;
    for (const [a, e] of parts) {
      let eq = -1, arrow = false;
      for (let j = a; j < e; j++) { if (toks[j].t === 'p' && OPEN[toks[j].s] && close[j] > 0) { j = close[j]; continue; } if (isP(j, '=') && eq < 0) eq = j; if (isP(j, '=>')) arrow = true; }
      if (isId(a) && eq > a) { last = { name: toks[a].s, tok: a, a: eq + 1, b: e, block: p, isLet, isFn: arrow }; defs.push(last); }
      else if (last) last.b = e;                                     // a comma inside a type: part of the declarator before it
    }
  };
  const block = (i: number): Node => {
    const body: Node[] = [];
    for (let j = i + 1; j < close[i];) { const n = stmt(j); body.push(n); j = n.b + 1; }
    return { k: 'block', a: i, b: close[i], body };
  };
  const stmt = (i: number): Node => {
    if (isP(i, '{')) return block(i);
    if (isId(i, 'export')) return { ...stmt(i + 1), a: i };
    if (isId(i, 'if') && isP(i + 1, '(')) {
      const c0 = i + 1, c1 = close[c0], then = stmt(c1 + 1);
      if (isId(then.b + 1, 'else')) { const els = stmt(then.b + 2); return { k: 'if', a: i, b: els.b, c0, c1, then, else: els }; }
      return { k: 'if', a: i, b: then.b, c0, c1, then };
    }
    if ((isId(i, 'for') || isId(i, 'while')) && isP(i + 1, '(')) { const c0 = i + 1, c1 = close[c0], body = stmt(c1 + 1); return { k: 'loop', a: i, b: body.b, c0, c1, body }; }
    if (isId(i, 'function') && isId(i + 1) && isP(i + 2, '(')) {
      let j = close[i + 2] + 1;
      while (j < toks.length && !isP(j, '{')) j++;                    // past the return type
      const body = block(j);
      fns.push({ a: i, b: body.b, name: toks[i + 1].s, params: paramNames(i + 2) });
      return { k: 'fn', a: i, b: body.b, name: toks[i + 1].s, body };
    }
    if (isId(i, 'interface') || isId(i, 'switch')) { let j = i + 1; while (j < toks.length && !isP(j, '{')) j++; return { k: 'stmt', a: i, b: close[j], jump: false, inner: [] }; }
    // an expression or a declaration: to the `;` at its own depth, or to the end of the block it stands in; the block
    // bodies of arrow functions inside it are statements of their own
    const p = parent[i], end = p >= 0 ? close[p] : toks.length, inner: Node[] = [];
    let j = i;
    for (; j < end; j++) {
      if (isP(j, ';') && parent[j] === p) break;
      if (isP(j, '{') && isP(j - 1, '=>')) { const body = block(j), h = arrowHead(j); fns.push({ a: h.a, b: body.b, name: h.name, params: h.params }); inner.push({ k: 'fn', a: j, b: body.b, name: h.name, body }); j = body.b; }
    }
    const b = Math.min(j, end - 1);
    if (isId(i, 'const') || isId(i, 'let')) declare(i, b);
    return { k: 'stmt', a: i, b, jump: isId(i, 'return') || isId(i, 'continue') || isId(i, 'break') || isId(i, 'throw'), inner };
  };
  const top: Node[] = [];
  for (let j = 0; j < toks.length;) { const n = stmt(j); top.push(n); j = n.b + 1; }

  // --- names ---------------------------------------------------------------------------------------------------------
  const inside = (i: number, bracket: number): boolean => { for (let p = parent[i]; ; p = parent[p]) { if (p === bracket) return true; if (p < 0) return false; } };
  /** The declaration a name refers to at token `at`: the nearest one before it whose block encloses it. */
  const lookup = (name: string, at: number): Def | undefined => {
    let best: Def | undefined;
    for (const d of defs) if (d.name === name && d.tok < at && (d.block < 0 || inside(at, d.block)) && (!best || d.tok > best.tok)) best = d;
    return best;
  };
  /** The named function a token stands in, innermost. */
  const fnAt = (at: number): Fn | undefined => { let best: Fn | undefined; for (const f of fns) if (f.a <= at && at <= f.b && f.name !== 'λ' && (!best || f.a > best.a)) best = f; return best; };
  /** The function whose parameter a name is at `at` (a parameter hides a declaration outside its function). */
  const paramOwner = (name: string, at: number, d: Def | undefined): Fn | undefined => {
    let best: Fn | undefined;
    for (const f of fns) if (f.a <= at && at <= f.b && f.params.includes(name) && (!d || d.tok < f.a) && (!best || f.a > best.a)) best = f;
    return best;
  };
  const strip = (a: number, b: number): [number, number] => { while (b - a >= 2 && isP(a, '(') && close[a] === b - 1) { a++; b--; } return [a, b]; };
  /** What a name stands for at `at`: its declaration, or, for a parameter, the argument the call on this path passes. */
  const resolve = (name: string, at: number, env: Env | undefined): { d: Def; env: Env | undefined } | undefined => {
    const d = lookup(name, at), owner = paramOwner(name, at, d);
    if (!owner) return d ? { d, env } : undefined;
    for (let e = env; e; e = e.up) if (e.fn === owner) {
      const r = e.args.get(name);
      if (!r) return undefined;
      const [s, t] = strip(r[0], r[1]);
      if (t - s === 1 && isId(s) && toks[s].s === name) return resolve(name, s, e.up);
      return { d: { name, tok: s, a: s, b: t, block: -2, isLet: false, isFn: false }, env: e.up };
    }
    return undefined;
  };
  const topHas = (a: number, b: number, ops: Set<string>): number => {
    for (let j = a; j < b; j++) {
      if (toks[j].t === 'p' && OPEN[toks[j].s] && close[j] > 0 && close[j] < b) { j = close[j]; continue; }
      if (toks[j].t === 'p' && ops.has(toks[j].s) && !postfixBang(j) && !unary(j)) return j;
    }
    return -1;
  };
  /** A definition worth opening: a comparison, a logical operator, a negation or a conditional in it; one call of a predicate; or a plain member access (an alias such as `x.ownMales`). */
  const opens = (d: Def): boolean => {
    if (d.isFn || isId(d.a, 'new')) return false;
    let alias = true;
    for (let j = d.a; j < d.b; j++) {
      const k = toks[j];
      if (k.t === 'p' && (k.s === '&&' || k.s === '||' || k.s === '?' || COMPARE.has(k.s) || (k.s === '!' && !postfixBang(j)))) return true;
      if (!(k.t === 'id' || (k.t === 'p' && (k.s === '.' || k.s === '?.' || k.s === '[' || k.s === ']')))) alias = false;
    }
    if (alias && d.b - d.a >= 3) return true;
    return isId(d.a) && PREDICATE.test(toks[d.a].s) && isP(d.a + 1, '(') && close[d.a + 1] === d.b - 1;
  };
  const reads = (j: number) => toks[j].t === 'id' && !isP(j - 1, '.') && !isP(j - 1, '?.') && !isP(j + 1, '(') && !STOP.has(toks[j].s);
  /** The definitions of the local names read in [a, b), three levels deep, each name once; a `let` name is not opened (its value moves). */
  const wheres = (a: number, b: number, depth: number, seen: Set<string>, ranges: [number, number][], env: Env | undefined): string[] => {
    const out: string[] = [];
    for (let j = a; j < b; j++) {
      if (!reads(j) || seen.has(toks[j].s)) continue;
      const r = resolve(toks[j].s, j, env);
      if (!r || r.d.isLet || !(r.d.block === -2 || opens(r.d))) continue;   // (block -2: an argument bound to a parameter, always shown)
      seen.add(toks[j].s); ranges.push([r.d.a, r.d.b]);
      const t = text(r.d.a, r.d.b);
      out.push(`${toks[j].s} := ${t.length > WHERE_MAX ? `${t.slice(0, WHERE_MAX)} …` : t}`);
      if (depth < 3) out.push(...wheres(r.d.a, r.d.b, depth + 1, seen, ranges, r.env));
    }
    return out;
  };
  /** The names read in each atom's own condition, with where they are read (for sourcesOf). */
  const readsOf = new Map<Atom, { name: string; at: number; env: Env | undefined }[]>();
  const atomOf = (a: number, b: number, how: Atom['how'], via: string, env: Env | undefined, shown?: string): Atom => {
    const ranges: [number, number][] = [[a, b]], w = wheres(a, b, 1, new Set(), ranges, env);
    const numbers: string[] = [], params: string[] = [];
    for (const [s, e] of ranges) for (let j = s; j < e; j++) {
      const k = toks[j];
      if (k.t === 'id' && isP(j - 1, '.') && (isId(j - 2, 'P') || isId(j - 2, 'curP')) && !isP(j - 3, '.') && !params.includes(k.s)) params.push(k.s);
      if (k.t !== 'num') continue;
      // left out: 0; a bit of a switch; a number a registry switch is tested against; 1 unless an age is compared with it
      const pp = parent[j], bit = pp >= 0 && isP(pp, '(') && toks[pp - 1]?.t === 'id' && SWITCH_FNS.has(toks[pp - 1].s);
      const cmp = toks[j - 1]?.t === 'p' && (COMPARE.has(toks[j - 1].s) || toks[j - 1].s === '&');
      const ofSwitch = cmp && isId(j - 2) && isP(j - 3, '.') && (isId(j - 4, 'P') || isId(j - 4, 'curP'));
      const n = Number(k.s.replace(/_/g, ''));
      if (n === 0 || bit || ofSwitch || (n === 1 && !(cmp && isId(j - 2, 'age')))) continue;
      const value = (isP(j - 1, '-') && unary(j - 1) ? '-' : '') + k.s;
      if (!numbers.includes(value)) numbers.push(value);
    }
    const atom: Atom = { text: [shown ?? text(a, b), ...w].join(' | '), line: toks[a].line, how, via, numbers, params };
    const rs: { name: string; at: number; env: Env | undefined }[] = [];
    for (let j = a; j < b; j++) if (toks[j].t === 'id' && !isP(j - 1, '.') && !isP(j - 1, '?.') && !isP(j + 1, '(')) rs.push({ name: toks[j].s, at: j, env });
    readsOf.set(atom, rs);
    return atom;
  };
  /**
   * The conjuncts of a condition as atoms. An expression with a top-level `||`, `?` or `??` is one atom (`&&` binds
   * tighter). A conjunct that is a bare local name whose definition is worth opening and is no conditional is replaced
   * by that definition's conjuncts.
   */
  const conjuncts = (a0: number, b0: number, how: Atom['how'], via: string, env: Env | undefined, depth = 0): Atom[] => {
    const [a, b] = strip(a0, b0);
    if (b <= a) return [];
    if (topHas(a, b, new Set(['||', '?', '??'])) >= 0) return [atomOf(a, b, how, via, env)];
    const out: Atom[] = [];
    for (let [s, e] of split(a, b, '&&')) {
      [s, e] = strip(s, e);
      if (e <= s) continue;
      if (topHas(s, e, new Set(['||', '?', '??', '&&'])) >= 0) { out.push(...conjuncts(s, e, how, via, env, depth)); continue; }
      const r = e - s === 1 && reads(s) ? resolve(toks[s].s, s, env) : undefined;
      if (r && !r.d.isLet && opens(r.d) && depth < 3 && topHas(...strip(r.d.a, r.d.b), new Set(['?'])) < 0) out.push(...conjuncts(r.d.a, r.d.b, how, via ? `${via} > ${toks[s].s}` : toks[s].s, r.env, depth + 1));
      else out.push(atomOf(s, e, how, via, env));
    }
    return out;
  };
  /**
   * The negation of a condition, operand by operand of a top-level `||` (De Morgan). Written exactly but readably: the
   * negation of `!X` is X; of one comparison, the opposite comparison; of a bare name, `!name`; anything else `NOT …`.
   */
  const negated = (a0: number, b0: number, how: Atom['how'], env: Env | undefined): Atom[] => {
    const [a, b] = strip(a0, b0);
    if (topHas(a, b, new Set(['?', '??'])) >= 0) return [atomOf(a, b, how, '', env, `NOT ${text(a, b)}`)];
    return split(a, b, '||').flatMap(([s0, e0]) => {
      const [s, e] = strip(s0, e0);
      if (isP(s, '!') && !postfixBang(s) && topHas(s + 1, e, BINARY) < 0) return conjuncts(s + 1, e, how, '', env);
      const op = topHas(s, e, COMPARE);
      if (op > s && topHas(s, e, new Set(['&&', '||', '?', '??'])) < 0 && topHas(op + 1, e, COMPARE) < 0) return [atomOf(s, e, how, '', env, `${text(s, op)} ${FLIP[toks[op].s]} ${text(op + 1, e)}`)];
      if (e - s === 1 && isId(s)) return [atomOf(s, e, how, '', env, `!${toks[s].s}`)];
      return [atomOf(s, e, how, '', env, `NOT ${text(s, e)}`)];
    });
  };

  // --- the gates around a token -----------------------------------------------------------------------------------------
  type Frame = { k: 'fn'; name: string } | { k: 'atoms'; atoms: Atom[] };
  const jumps = (n: Node): boolean => n.k === 'stmt' ? n.jump : n.k === 'block' ? n.body.length > 0 && jumps(n.body[n.body.length - 1]) : false;
  const frames = (nodes: Node[], p: number, out: Frame[], env: Env | undefined): void => {
    for (const n of nodes) {
      if (n.b < p) {
        // a guard before it in this block: `if (cond) continue;`, `if (cond) return …;`, `if (cond) { …; continue; }`
        if (n.k === 'if' && !n.else && jumps(n.then)) out.push({ k: 'atoms', atoms: negated(n.c0 + 1, n.c1, 'guard', env) });
        continue;
      }
      if (n.a > p) return;
      if (n.k === 'block') frames(n.body, p, out, env);
      else if (n.k === 'if') {
        if (p <= n.c1) return;
        if (p <= n.then.b) { out.push({ k: 'atoms', atoms: conjuncts(n.c0 + 1, n.c1, 'if', '', env) }); frames([n.then], p, out, env); }
        else if (n.else) { out.push({ k: 'atoms', atoms: negated(n.c0 + 1, n.c1, 'else', env) }); frames([n.else], p, out, env); }
      } else if (n.k === 'loop') {
        if (p <= n.c1) return;
        const parts = split(n.c0 + 1, n.c1, ';'), [s, e] = parts.length === 3 ? parts[1] : parts[0];
        // `i < list.length` reads "each of list"
        const each = e - s >= 5 && isId(s) && isP(s + 1, '<') && isId(e - 1, 'length') && isP(e - 2, '.') && topHas(s + 2, e, BINARY) < 0 ? `EACH of ${text(s + 2, e - 2)}` : `EACH ${text(s, e)}`;
        out.push({ k: 'atoms', atoms: [atomOf(s, e, 'loop', '', env, each)] });
        frames([n.body], p, out, env);
      } else if (n.k === 'fn') { out.push({ k: 'fn', name: n.name }); frames([n.body], p, out, env); }
      else {
        const f = n.inner.find(q => q.a <= p && p <= q.b);
        if (f) { frames([f], p, out, env); return; }
        // operands before it in a short-circuit chain: `a && b && call(…)`
        let s = p;
        for (let j = p - 1; j >= n.a; j--) {
          if (toks[j].t === 'p' && CLOSE.has(toks[j].s) && openOf[j] >= 0) { j = openOf[j]; s = j; continue; }
          if (parent[j] !== parent[p]) break;
          if ((toks[j].t === 'p' && ['=', ';', ',', '?', ':', '||', '=>', '+=', '-='].includes(toks[j].s)) || isId(j, 'return') || isId(j, 'const') || isId(j, 'let')) break;
          s = j;
        }
        if (s < p - 1 && isP(p - 1, '&&')) out.push({ k: 'atoms', atoms: conjuncts(s, p - 1, 'and', '', env) });
      }
      return;
    }
  };
  /** The conditions between the start of the function a token stands in and the token, each text once. */
  const gatesAt = (p: number, env: Env | undefined): Atom[] => {
    const fs: Frame[] = [];
    frames(top, p, fs, env);
    let last = -1;
    fs.forEach((f, i) => { if (f.k === 'fn') last = i; });
    const seen = new Set<string>();
    return fs.slice(last + 1).flatMap(f => f.k === 'atoms' ? f.atoms : []).filter(a => !seen.has(a.text) && !!seen.add(a.text));
  };
  const callsOf = (name: string): number[] => { const out: number[] = []; for (let i = 0; i < toks.length; i++) if (isId(i, name) && isP(i + 1, '(') && !isId(i - 1, 'function') && !isP(i - 1, '.')) out.push(i); return out; };
  const dedupe = (atoms: Atom[]): Atom[] => { const seen = new Set<string>(); return atoms.filter(a => !seen.has(a.text) && !!seen.add(a.text)); };
  /** Every way to reach token `p` from `root`: its own gates, behind the gates of each call of the function it stands in. */
  const pathsTo = (p: number, depth = 0): { label: string; atoms: Atom[]; env: Env | undefined }[] => {
    const f = fnAt(p);
    if (!f || f.name === root || depth > 3) return [{ label: '', atoms: gatesAt(p, undefined), env: undefined }];
    const out: { label: string; atoms: Atom[]; env: Env | undefined }[] = [];
    for (const q of callsOf(f.name)) for (const up of pathsTo(q, depth + 1)) {
      const args = split(q + 2, close[q + 1], ','), env: Env = { fn: f, args: new Map(f.params.map((n, i) => [n, args[i]] as [string, [number, number]]).filter(e => !!e[1] && e[1][1] > e[1][0])), up: up.env };
      out.push({ label: `${up.label ? `${up.label} > ` : ''}${f.name}() called at line ${toks[q].line}`, atoms: dedupe([...up.atoms, ...gatesAt(p, env)]), env });
    }
    return out.length ? out : [{ label: `${f.name}() (no call found)`, atoms: gatesAt(p, undefined), env: undefined }];
  };
  /** Where a `let` name or a scratch list read by a gate is set: the gates around each assignment or push before it in the function that holds it. */
  const sourcesOf = (atoms: Atom[]): Path[] => {
    const out: Path[] = [];
    for (const a of atoms) for (const r of readsOf.get(a) ?? []) {
      const scratch = r.name.startsWith('_');
      let at = r.at, env = r.env, d = lookup(r.name, at);
      // a parameter passed a name of the caller: follow it to the caller's declaration
      for (let owner = paramOwner(r.name, at, d), hops = 0; owner && hops < 4; hops++) {
        let e = env;
        while (e && e.fn !== owner) e = e.up;
        const arg = e?.args.get(r.name), s = arg ? strip(arg[0], arg[1]) : undefined;
        if (!e || !s || !(s[1] - s[0] === 1 && isId(s[0]) && toks[s[0]].s === r.name)) { d = undefined; break; }
        at = s[0]; env = e.up; d = lookup(r.name, at); owner = paramOwner(r.name, at, d);
      }
      if (!scratch && !(d && d.isLet)) continue;
      const f = fnAt(at), lo = scratch ? (f?.a ?? 0) : d!.tok + 1;
      for (let j = lo; j < at; j++) {
        if (!isId(j, r.name) || isP(j - 1, '.')) continue;
        const set = scratch ? isP(j + 1, '.') && isId(j + 2, 'push') : isP(j + 1, '=') && !isId(j - 1, 'let') && !isId(j - 1, 'const');
        const label = `${r.name} ${scratch ? 'filled' : 'set'} at line ${toks[j].line}`;
        if (set && !out.some(q => q.label === label)) out.push({ label, atoms: gatesAt(j, env) });
      }
    }
    return out;
  };

  // --- the sites -----------------------------------------------------------------------------------------------------
  const sites: OfferSite[] = [], seq = new Map<string, number>();
  for (let i = 0; i < toks.length; i++) {
    if (!isId(i, offerFn) || !isP(i + 1, '(') || isId(i - 1, 'function') || isP(i - 1, '.')) continue;
    if (!(toks[i + 2]?.t === 'str' && isP(i + 3, ','))) continue;   // a computed action: the valuation ledger lists it as dynamic
    const args = split(i + 2, close[i + 1], ','), action = toks[i + 2].s;
    const variants: string[] = [];
    if (args[3]) for (let j = args[3][0]; j < args[3][1]; j++) if (isId(j, 'V') && isP(j + 1, '.') && isId(j + 2) && !variants.includes(toks[j + 2].s)) variants.push(toks[j + 2].s);
    if (!variants.length) variants.push('NONE');
    const aux = !!args[4] && text(args[4][0], args[4][1]) !== '-1';
    const found = pathsTo(i), fn = fnAt(i)?.name ?? '';
    const sources: Path[] = [];
    for (const q of found) for (const s of sourcesOf(q.atoms)) if (!sources.some(o => o.label === s.label)) sources.push(s);
    const paths: Path[] = found.map(q => ({ label: q.label, atoms: q.atoms }));
    const stem = `${fn}/${action}/${variants.join('+')}`, n = (seq.get(stem) ?? 0) + 1;
    seq.set(stem, n);
    const target = args[1] ? text(args[1][0], args[1][1]) : '', score = args[2] ? text(args[2][0], args[2][1]) : '';
    const print = fnv(JSON.stringify([action, variants, aux, target, paths.map(q => q.atoms.map(a => a.text)), sources.map(q => q.atoms.map(a => a.text))]));
    sites.push({ key: `${stem}#${n}`, line: toks[i].line, fn, action, variants, aux, target, score, paths, sources, print });
  }
  return sites;
}

/** Every distinct condition text of a list of sites, with the sites (keys) that carry it. */
export function atomIndex(sites: OfferSite[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const s of sites) for (const p of [...s.paths, ...s.sources]) for (const a of p.atoms) { const v = out.get(a.text) ?? []; if (!v.includes(s.key)) v.push(s.key); out.set(a.text, v); }
  return out;
}
