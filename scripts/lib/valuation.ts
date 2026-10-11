// Stage R7 (docs/staging/r7-ledger.md §5): the valuation ledger's counting rules. The prescription ledger
// (scripts/lib/prescriptions.ts) leaves score literals out by its own text; this counts them, with the offer sites, the
// terms switched by who the animal is, and the clock and bucket constants, so "how much is still hand-coded" has a
// denominator. Pure: source text in, lists with line numbers out. TypeScript 7 ships no parser a script can call, so the
// scan is lexical (comments, strings and template text never count); every rule below is a rule on tokens, stated so
// that a reader can check any item against its line.

export interface Tok { t: 'num' | 'id' | 'str' | 'p'; s: string; line: number }

const OPS = ['>>>=', '===', '!==', '>>>', '...', '**=', '<<=', '>>=', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>'];
const NUM = /^(0[xX][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/;
const REGEX_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&&', '||', '?', '{', '}', ';', '=>', 'return']);

/** Tokens of TypeScript source: numbers, identifiers, strings (quotes, templates and regular expressions, each one token) and punctuation; comments dropped. */
export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0, line = 1;
  const skipString = (q: string): void => { i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; if (src[i] === '\n') line++; i++; } i++; };
  // a template: text and ${ code } parts, nested to any depth; the whole of it is one string token
  const skipTemplate = (): void => {
    i++;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        i += 2;
        for (let depth = 1; i < src.length && depth > 0;) {
          const ch = src[i];
          if (ch === '\'' || ch === '"') skipString(ch);
          else if (ch === '`') skipTemplate();
          else { if (ch === '{') depth++; else if (ch === '}') depth--; else if (ch === '\n') line++; i++; }
        }
        continue;
      }
      if (src[i] === '\n') line++;
      i++;
    }
    i++;
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\n') { line++; i++; continue; }
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }
    if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (ch === '/' && src[i + 1] === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue; }
    const at = line;
    if (ch === '\'' || ch === '"') { const a = i; skipString(ch); out.push({ t: 'str', s: src.slice(a + 1, i - 1), line: at }); continue; }
    if (ch === '`') { const a = i; skipTemplate(); out.push({ t: 'str', s: src.slice(a + 1, i - 1), line: at }); continue; }
    if (ch === '/' && (out.length === 0 || REGEX_AFTER.has(out[out.length - 1].s))) { // a regular expression, not a division
      const a = i; i++;
      for (let cls = false; i < src.length && (cls || src[i] !== '/') && src[i] !== '\n'; i++) { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; }
      i++; while (/[a-z]/.test(src[i] ?? '')) i++;
      out.push({ t: 'str', s: src.slice(a, i), line: at }); continue;
    }
    if (/[A-Za-z_$]/.test(ch)) { const a = i; while (i < src.length && /[\w$]/.test(src[i])) i++; out.push({ t: 'id', s: src.slice(a, i), line: at }); continue; }
    const m = (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1] ?? ''))) ? NUM.exec(src.slice(i, i + 40)) : null;
    if (m) { out.push({ t: 'num', s: m[0], line: at }); i += m[0].length; continue; }
    const op = OPS.find(o => src.startsWith(o, i)) ?? ch;
    out.push({ t: 'p', s: op, line: at }); i += op.length;
  }
  return out;
}

const OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const CLOSE = new Set([')', ']', '}']);
/** For each token, the position of its nearest enclosing open bracket (-1 at the top), and for each open bracket its closing one. */
export function brackets(toks: Tok[]): { parent: Int32Array; close: Int32Array } {
  const parent = new Int32Array(toks.length).fill(-1), close = new Int32Array(toks.length).fill(-1), stack: number[] = [];
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i];
    if (k.t === 'p' && CLOSE.has(k.s)) { const o = stack.pop(); if (o !== undefined) close[o] = i; }
    parent[i] = stack.length ? stack[stack.length - 1] : -1;
    if (k.t === 'p' && OPEN[k.s]) stack.push(i);
  }
  return { parent, close };
}

const isP = (k: Tok | undefined, s: string) => !!k && k.t === 'p' && k.s === s;
const isId = (k: Tok | undefined, s?: string) => !!k && k.t === 'id' && (s === undefined || k.s === s);
const COMPARE = new Set(['===', '!==', '==', '!=', '>=', '<=', '>', '<']);
const ASSIGN = new Set(['=', '+=', '-=', '*=', '/=']);
const TYPE_WORDS = new Set(['number', 'string', 'boolean', 'true', 'false', 'null', 'undefined', 'void', 'never', 'unknown']);

export interface Site { file: string; line: number; action: string; text: string }
/** `role`: what the number does where it stands: compared with an age ('age'), compared with anything else ('threshold'), or a term of a sum or product ('weight'). */
export interface Literal { file: string; line: number; value: string; context: 'offer' | 'gate' | 'reaches' | 'wording' | 'other'; role: 'age' | 'threshold' | 'weight'; text: string }
export interface Left { file: string; line: number; value: string; why: string }
export interface Term { file: string; line: number; where: 'score-term' | 'offer-gate'; categories: string[]; text: string }
/** `wording`: the comparison stands in a wording function (it chooses a reason's words, not a value). */
export interface Clock { file: string; line: number; kind: 'hour of day' | 'elapsed time' | 'daylight'; value: string; text: string; wording: boolean }

/** Who the animal or its partner is: the words that mark a term as stating a field conclusion (§5). A term may carry several. */
export const CATEGORY_WORDS: Record<string, RegExp> = {
  sex: /^(male|sex|isAdultMale|rankedMale|female)$/,
  'rank or dominance': /^(dominates|isAlpha|alphaId|rank|rankOrder|rankedMale|elo)$/,
  kinship: /^(maternalKin|kin|motherId|sibling)$/,
  alliance: /^(allies|alphaAlly)$/,
  'reproductive state': /^(swelling|lactating|pregnancy|oestrusOf|oestrusNear)$/,
  'community membership': /^(immigrantAge|natalTroopId|strangers|strangerMales|newcomers|troopId)$/,
  'age class': /^(age|adolescentOrAdult)$/,
};

export interface Scan {
  file: string; tokens: number;
  sites: Site[];
  /** Calls of offer() whose action is not a string literal. */ dynamic: Site[];
  literals: Literal[];
  /** Numbers left out as structure, with the rule that left each out. */ left: Left[];
  terms: Term[];
  clock: Clock[];
  /** Registry ids read as `P.<id>` or `curP.<id>`. */ params: string[];
}

export interface ScanOpts {
  /** Names of object tables whose numbers are ids, not values (candidates.ts: V, CODE). */ tables?: string[];
  /** The function whose calls are offers, and helpers that only wrap it. */ offerFns?: string[];
  /** Functions whose numbers choose wording, not value. */ wordingFns?: string[];
  /** Functions taking (P, bit): the number names a bit of a switch. */ bitFns?: string[];
}

/**
 * One file's scan. Rules (docs/staging/r7-ledger.md §5):
 * - an offer site is a call `offer('<action>', …)`;
 * - a number is left out when it is 0 or 1 (with or without a minus), a hexadecimal constant, inside an id table, an array
 *   position, the start or the step of a `for`, a hash salt, a test of a registry switch (`P.x === 2`, a bit of a switch),
 *   or a test of an act's phase or of a length;
 * - every other number gets one context, the first that fits: inside an offer call ('offer'); inside the condition of an
 *   `if` whose body offers ('gate'); inside a wording function ('wording'); in the definition of a name that reaches an
 *   offer call, followed through the names used there ('reaches'); 'other'. Names are followed without scope, so
 *   'reaches' takes in nearly every remaining number of a file whose main function offers: it is an upper count;
 * - a term is a `a ? b : c` in an offer call or a reaching definition, or the condition of a gate, whose test names sex,
 *   rank, kinship, alliance, reproductive state, community membership or age;
 * - a clock constant is a number compared with `hour`, with `time - …` or with `daylight`.
 */
export function scanSource(file: string, src: string, opts: ScanOpts = {}): Scan {
  const toks = tokenize(src), { parent, close } = brackets(toks), lines = src.split('\n');
  const tables = new Set(opts.tables ?? []), offerFns = new Set(opts.offerFns ?? ['offer']), wordingFns = new Set(opts.wordingFns ?? []), bitFns = new Set(opts.bitFns ?? []);
  const textAt = (line: number) => (lines[line - 1] ?? '').trim().slice(0, 140);
  const inRange = (i: number, r: [number, number]) => i > r[0] && i < r[1];

  // --- function bodies and definitions ---------------------------------------------------------------------------------
  /** A definition: a name and the token range that defines it (a function's parameters and body, or a declarator's expression). */
  const defs: { name: string; range: [number, number] }[] = [];
  const fnBody = new Map<string, [number, number]>();
  for (let i = 0; i < toks.length; i++) {
    if (isId(toks[i], 'function') && isId(toks[i + 1]) && isP(toks[i + 2], '(')) {
      let j = close[i + 2] + 1;
      while (j < toks.length && !isP(toks[j], '{')) j++;   // past the return type
      if (j < toks.length && close[j] > 0) { defs.push({ name: toks[i + 1].s, range: [i + 2, close[j]] }); fnBody.set(toks[i + 1].s, [j, close[j]]); }
    }
  }
  // the end of an expression that starts at `a`: a `;` or `,` at its own depth, or the bracket that closes around it
  const exprEnd = (a: number): number => { const p = parent[a]; for (let j = a; j < toks.length; j++) { if (parent[j] === p && toks[j].t === 'p' && (toks[j].s === ';' || toks[j].s === ',')) return j; if (p >= 0 && j === close[p]) return j; if (OPEN[toks[j].s] && toks[j].t === 'p' && close[j] > 0) j = close[j]; } return toks.length; };
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i];
    // declarators: const a = …, b = …;
    if (isId(k, 'const') || isId(k, 'let')) {
      let j = i + 1;
      while (j < toks.length) {
        if (!isId(toks[j])) break;                           // a destructuring pattern: not followed
        const name = toks[j].s, p = parent[j];
        let e = j + 1;
        while (e < toks.length && !(parent[e] === p && toks[e].t === 'p' && (toks[e].s === '=' || toks[e].s === ';' || toks[e].s === ',')) && !(p >= 0 && e === close[p])) { if (toks[e].t === 'p' && OPEN[toks[e].s] && close[e] > 0) e = close[e]; e++; }
        if (!isP(toks[e], '=')) { if (isP(toks[e], ',')) { j = e + 1; continue; } break; }
        const end = exprEnd(e + 1);
        if (!TYPE_WORDS.has(name)) defs.push({ name, range: [e, end] });   // a type's comma can look like a declarator
        if (isP(toks[end], ',') ) { j = end + 1; continue; }
        break;
      }
      continue;
    }
    // plain assignments: name = …, name += …
    if (k.t === 'id' && toks[i + 1]?.t === 'p' && ASSIGN.has(toks[i + 1].s) && !isP(toks[i - 1], '.') && !isId(toks[i - 1], 'const') && !isId(toks[i - 1], 'let') && !isP(toks[i - 1], ',') && !isP(toks[i - 1], '?'))
      { if (!TYPE_WORDS.has(k.s)) defs.push({ name: k.s, range: [i + 1, exprEnd(i + 2)] }); }
  }

  // --- offer sites ---------------------------------------------------------------------------------------------------
  const sites: Site[] = [], dynamic: Site[] = [], offerRanges: [number, number][] = [];
  for (let i = 0; i < toks.length; i++) {
    if (toks[i].t !== 'id' || !offerFns.has(toks[i].s) || !isP(toks[i + 1], '(') || isId(toks[i - 1], 'function') || isP(toks[i - 1], '.')) continue;
    offerRanges.push([i + 1, close[i + 1]]);
    if (toks[i].s !== 'offer') continue;                       // a wrapper: its own body holds the offer sites
    const first = toks[i + 2], site = { file, line: toks[i].line, action: first?.t === 'str' ? first.s : '', text: textAt(toks[i].line) };
    if (first?.t === 'str' && isP(toks[i + 3], ',')) sites.push(site); else dynamic.push(site);
  }
  // functions that offer: their body holds an offer call, or calls a function that does
  const offering = new Set<string>();
  for (let grown = true; grown;) {
    grown = false;
    for (const [name, r] of fnBody) {
      if (offering.has(name)) continue;
      let hit = offerRanges.some(o => inRange(o[0], r));
      for (let j = r[0]; !hit && j < r[1]; j++) if (toks[j].t === 'id' && offering.has(toks[j].s) && isP(toks[j + 1], '(')) hit = true;
      if (hit) { offering.add(name); grown = true; }
    }
  }

  // --- gates: the condition of an `if` whose body offers -----------------------------------------------------------------
  const gates: [number, number][] = [];
  for (let i = 0; i < toks.length; i++) {
    if (!isId(toks[i], 'if') || !isP(toks[i + 1], '(')) continue;
    const c0 = i + 1, c1 = close[c0], b0 = c1 + 1;
    let b1 = isP(toks[b0], '{') ? close[b0] : b0;
    if (!isP(toks[b0], '{')) while (b1 < toks.length && !(parent[b1] === parent[i] && isP(toks[b1], ';'))) b1++;
    let offers = offerRanges.some(o => o[0] >= b0 && o[0] <= b1);
    for (let j = b0; !offers && j <= b1 && j < toks.length; j++) if (toks[j].t === 'id' && offering.has(toks[j].s) && !offerFns.has(toks[j].s) && isP(toks[j + 1], '(')) offers = true;
    if (offers) gates.push([c0, c1]);
  }

  // --- names that reach an offer call --------------------------------------------------------------------------------
  const reach = new Set<string>(offerFns), reachRanges: [number, number][] = [];
  const idsIn = (r: [number, number]) => { for (let j = r[0] + 1; j < r[1]; j++) if (toks[j].t === 'id' && !isP(toks[j - 1], '.') && !isP(toks[j - 1], '?.')) reach.add(toks[j].s); };
  offerRanges.forEach(idsIn);
  const done = new Set<number>();
  for (let grown = true; grown;) {
    grown = false;
    defs.forEach((d, n) => { if (!done.has(n) && reach.has(d.name)) { done.add(n); reachRanges.push(d.range); idsIn(d.range); grown = true; } });
  }
  const wordingRanges = [...wordingFns].map(n => fnBody.get(n)).filter((r): r is [number, number] => !!r);

  // --- numbers -------------------------------------------------------------------------------------------------------
  const tableRanges: [number, number][] = [];
  for (let i = 0; i < toks.length; i++) if (isId(toks[i], 'const') && isId(toks[i + 1]) && tables.has(toks[i + 1].s)) { let j = i + 2; while (j < toks.length && !isP(toks[j], '=')) j++; if (isP(toks[j + 1], '{')) tableRanges.push([j + 1, close[j + 1]]); }
  const literals: Literal[] = [], left: Left[] = [];
  const negative = (i: number) => isP(toks[i - 1], '-') && (i < 2 || (toks[i - 2].t === 'p' && !CLOSE.has(toks[i - 2].s)) || isId(toks[i - 2], 'return'));
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i];
    if (k.t !== 'num') continue;
    const value = (negative(i) ? '-' : '') + k.s, n = Number(k.s.replace(/_/g, ''));
    const leave = (why: string) => left.push({ file, line: k.line, value, why });
    if (/^0[xX]/.test(k.s)) { leave('a hexadecimal constant (a hash or a limit)'); continue; }
    if (tableRanges.some(r => inRange(i, r))) { leave('an id in a table'); continue; }
    if (n === 0 || n === 1) { leave('0 or 1'); continue; }
    const p = parent[i];
    if (p >= 0 && isP(toks[p], '[') && (toks[p - 1]?.t === 'id' || isP(toks[p - 1], ')') || isP(toks[p - 1], ']')) && !isId(toks[p - 1], 'return')) { leave('an array position'); continue; }
    if (p >= 0 && isP(toks[p], '(') && isId(toks[p - 1], 'for')) {
      const semis: number[] = []; for (let j = p + 1; j < close[p]; j++) if (parent[j] === p && isP(toks[j], ';')) semis.push(j);
      if (semis.length === 2 && (i < semis[0] || i > semis[1])) { leave('the start or the step of a loop'); continue; }
    }
    if (p >= 0 && isP(toks[p], '(') && isId(toks[p - 1], 'hash01')) { leave('a hash salt'); continue; }
    if (p >= 0 && isP(toks[p], '(') && toks[p - 1]?.t === 'id' && bitFns.has(toks[p - 1].s)) { leave('a bit of a registry switch'); continue; }
    const before = toks[i - 1], b2 = toks[i - 2], b3 = toks[i - 3], b4 = toks[i - 4];
    const cmp = before?.t === 'p' && (COMPARE.has(before.s) || before.s === '&');
    if (cmp && isId(b2) && isP(b3, '.') && (isId(b4, 'P') || isId(b4, 'curP'))) { leave('a test of a registry switch'); continue; }
    if (cmp && isId(b2) && (b2!.s === 'phase' || b2!.s === 'length') && (isP(b3, '.') || isP(b3, '?.'))) { leave(`a test of ${b2!.s === 'phase' ? 'an act\'s phase' : 'a length'}`); continue; }
    // a wording function is named by the caller, so it is asked before the name-following rule: names are followed
    // without scope, and a reason's own thresholds would otherwise count as numbers that reach a score
    const context: Literal['context'] = offerRanges.some(r => inRange(i, r)) ? 'offer' : gates.some(r => inRange(i, r)) ? 'gate' : wordingRanges.some(r => inRange(i, r)) ? 'wording' : reachRanges.some(r => inRange(i, r)) ? 'reaches' : 'other';
    const after = toks[i + 1], compared = cmp || (after?.t === 'p' && COMPARE.has(after.s));
    const role: Literal['role'] = compared && ((cmp && isId(b2, 'age')) || (!cmp && isId(toks[i + 2], 'age'))) ? 'age' : compared ? 'threshold' : 'weight';
    literals.push({ file, line: k.line, value, context, role, text: textAt(k.line) });
  }

  // --- terms switched by who the animal is ---------------------------------------------------------------------------
  const terms: Term[] = [];
  // `troopId` names a community test only where two communities are compared (not where it indexes a table)
  const counts = (j: number) => toks[j].s !== 'troopId' || (toks[j + 1]?.t === 'p' && COMPARE.has(toks[j + 1].s)) || (toks[j - 3]?.t === 'p' && COMPARE.has(toks[j - 3].s));
  const catsOf = (a: number, b: number): string[] => { const got = new Set<string>(); for (let j = Math.max(0, a); j <= b; j++) if (toks[j].t === 'id' && counts(j)) for (const [c, re] of Object.entries(CATEGORY_WORDS)) if (re.test(toks[j].s)) got.add(c); return [...got].sort(); };
  const STOP = new Set([',', '=', '+=', '-=', '*=', '/=', '?', ':', '=>', ';', '{', '}', 'return']);
  for (let i = 0; i < toks.length; i++) {
    if (!isP(toks[i], '?') || isP(toks[i + 1], ':') || isP(toks[i + 1], ')') || isP(toks[i + 1], ',')) continue;   // `x?: T` is no conditional
    if (!(offerRanges.some(r => inRange(i, r)) || reachRanges.some(r => inRange(i, r)))) continue;
    // the test of the conditional: back to the bracket around it or to a lower-precedence token at its own depth
    let a = i - 1;
    while (a >= 0 && a !== parent[i] && !(parent[a] === parent[i] && (toks[a].t === 'p' || toks[a].s === 'return') && STOP.has(toks[a].s))) { a--; }
    const cats = catsOf(a + 1, i - 1);
    // its two branches, to the end of the expression: a score term holds a number or a registry value in one of them
    let z = i + 1, valued = false;
    for (let nested = 0; z < toks.length && z !== close[parent[i]] ; z++) {
      const t = toks[z];
      if (parent[z] === parent[i] && t.t === 'p') { if (t.s === '?') nested++; else if (t.s === ':') { if (nested-- < 0) break; } else if (t.s === ',' || t.s === ';') break; }
      if (t.t === 'num' || isId(t, 'P') || isId(t, 'curP')) valued = true;
    }
    if (cats.length && valued) terms.push({ file, line: toks[i].line, where: 'score-term', categories: cats, text: textAt(toks[i].line) });
  }
  for (const g of gates) { const cats = catsOf(g[0], g[1]); if (cats.length) terms.push({ file, line: toks[g[0]].line, where: 'offer-gate', categories: cats, text: textAt(toks[g[0]].line) }); }
  terms.sort((x, y) => x.line - y.line);

  // --- clock constants -----------------------------------------------------------------------------------------------
  const clock: Clock[] = [];
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i];
    if (k.t !== 'num' || !(toks[i - 1]?.t === 'p' && COMPARE.has(toks[i - 1].s))) continue;
    // the left side of the comparison, back to the start of its operand chain
    let a = i - 2, kind: Clock['kind'] | null = null, sawTime = false, minus = false;
    for (; a >= 0 && i - a < 14; a--) {
      const t = toks[a];
      if (t.t === 'p' && (t.s === '&&' || t.s === '||' || t.s === '?' || t.s === ':' || t.s === ';' || t.s === ',' || t.s === '=' || t.s === '{' || t.s === '=>')) break;
      if (a === parent[i]) break;
      if (isId(t, 'hour') && !isP(toks[a + 1], '(')) kind = 'hour of day';
      if (isId(t, 'daylight')) kind = 'daylight';
      if (isP(t, '-')) minus = true;
      if (isId(t, 'time') && !isP(toks[a - 1], '.') && isP(toks[a + 1], '-')) sawTime = true;
    }
    if (!kind && sawTime && minus) kind = 'elapsed time';
    if (kind) clock.push({ file, line: k.line, kind, value: k.s, text: textAt(k.line), wording: wordingRanges.some(r => inRange(i, r)) });
  }

  // --- registry ids read ---------------------------------------------------------------------------------------------
  const params = new Set<string>();
  for (let i = 2; i < toks.length; i++) if (toks[i].t === 'id' && isP(toks[i - 1], '.') && (isId(toks[i - 2], 'P') || isId(toks[i - 2], 'curP')) && !isP(toks[i - 3], '.')) params.add(toks[i].s);

  return { file, tokens: toks.length, sites, dynamic, literals, left, terms, clock, params: [...params].sort() };
}

/** Every number in a short constants file (src/decide), by the top-level declaration it sits in; 0, 1 and hexadecimal constants left out. */
export function constantsOf(file: string, src: string): { file: string; line: number; name: string; value: string; text: string }[] {
  const toks = tokenize(src), { parent } = brackets(toks), lines = src.split('\n'), out: { file: string; line: number; name: string; value: string; text: string }[] = [];
  let name = '';
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i];
    if (parent[i] === -1 && (isId(k, 'const') || isId(k, 'function') || isId(k, 'interface') || isId(k, 'type')) && isId(toks[i + 1])) name = toks[i + 1].s;
    if (k.t !== 'num' || /^0[xX]/.test(k.s)) continue;
    const n = Number(k.s.replace(/_/g, ''));
    if (n === 0 || n === 1) continue;
    out.push({ file, line: k.line, name, value: (isP(toks[i - 1], '-') && toks[i - 2]?.t === 'p' && !CLOSE.has(toks[i - 2].s) ? '-' : '') + k.s, text: (lines[k.line - 1] ?? '').trim().slice(0, 140) });
  }
  return out;
}
