// Stage RW bench, amendment A2 (docs/staging/rw-bench-prereg.md §11): the local Codex command-line tool as a kernel
// behind R1's async interface. It is an OUTSIDE model: a call sends derived wild packets (pseudonyms, coarse words,
// ranks; never a raw row, a code or a date) off this computer. So it is gated like Jev (src/kernel/kernels.ts
// jevKernel): every call is refused without an explicit approval and a positive cap on calls. It takes wild requests
// only, builds its prompt with scripts/lib/rw-serialize.ts buildCodexPrompt, and validates each case of an answer on
// its own. Requests asked at once are gathered into one prompt (up to `batch`); calls run one at a time.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KernelError, type KernelAnswer, type KernelRequest } from '../../src/kernel/types';
import type { WildKernel } from '../../src/rw/kernels';
import { wildRequestError } from '../../src/rw/packet';
import { buildCodexPrompt, CODEX_SCHEMA } from './rw-serialize';

export const CODEX_BIN = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex';
export interface CodexOptions {
  /** The user's explicit approval to send derived packets to Codex in this run. Anything but `true` refuses every call. */
  approved: boolean;
  /** Cap on calls of the tool in this run, a positive whole number. */
  maxCalls: number;
  bin?: string;
  /** `-m <model>` and `-c model_reasoning_effort=<effort>`; left out, the tool's own defaults apply. */
  model?: string; effort?: string;
  /** Packets per prompt (1 by default) and how long a lone request waits for company before its call starts. */
  batch?: number; gatherMs?: number;
  /** Seconds before a call is killed (300 by default). */
  timeoutS?: number;
  /** Called after every call: for the run's private log (artifacts/). */
  onCall?: (call: CodexCall & { prompt: string; raw: string }) => void;
}
export interface CodexCall { cases: number; seconds: number; tokens: number | null; promptChars: number; error: string }

/** The argument list of one call (exported so a test can pin it). Standard input is closed by the caller. */
export const codexArgs = (o: Pick<CodexOptions, 'model' | 'effort'>, cwd: string, schema: string, out: string, prompt: string): string[] => ['exec', '--sandbox', 'read-only', '--skip-git-repo-check', '--ephemeral',
  '-C', cwd, '--output-schema', schema, '-o', out, ...(o.model ? ['-m', o.model] : []), ...(o.effort ? ['-c', `model_reasoning_effort=${o.effort}`] : []), prompt];

/** Tokens as the tool reports them on its output ("tokens used: 20,577", with or without the colon or a line break); null when it reports none. */
export function tokensUsed(output: string): number | null {
  const m = [...output.matchAll(/tokens used\D{0,8}([\d][\d,._]*)/gi)].pop();
  return m ? Number(m[1].replace(/[,._]/g, '')) : null;
}

/** The answers of one call, one per case: an R1 answer, or the reason that case is refused. */
export function readCodexAnswer(text: string, menus: number[]): (KernelAnswer | string)[] {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return menus.map(() => 'codex output is not JSON'); }
  const obj = parsed as { choices?: unknown; choice?: unknown };
  const list: unknown[] = Array.isArray(obj?.choices) ? obj.choices : menus.length === 1 && obj && typeof obj === 'object' && 'choice' in obj ? [{ case: 1, choice: obj.choice }] : [];
  return menus.map((n, i) => {
    const mine = list.filter((e): e is { case: number; choice: unknown } => typeof e === 'object' && e !== null && (e as { case?: unknown }).case === i + 1);
    if (mine.length !== 1) return mine.length ? 'codex answered this case more than once' : 'codex gave no answer for this case';
    const k = mine[0].choice;
    if (typeof k !== 'number' || !Number.isInteger(k) || k < 0 || k >= n) return 'codex choice is not an option of this case';
    return { index: k, choice: `c${k}`, probabilities: Array.from({ length: n }, (_, j) => +(j === k)) };
  });
}

type Waiting = { request: KernelRequest; resolve: (a: KernelAnswer) => void; reject: (e: Error) => void };

export function codexKernel(o: CodexOptions): WildKernel & { calls(): CodexCall[] } {
  const batch = Math.max(1, Math.floor(o.batch ?? 1)), log: CodexCall[] = [], queue: Waiting[] = [];
  let chain: Promise<void> = Promise.resolve(), timer: ReturnType<typeof setTimeout> | null = null, started = 0;
  const gate = () => o.approved !== true ? 'Codex is gated: a call needs the user\'s explicit approval (derived packets leave this computer)'
    : !Number.isInteger(o.maxCalls) || o.maxCalls <= 0 ? 'Codex is gated: a call needs a positive call cap' : started >= o.maxCalls ? `Codex call cap reached (${o.maxCalls})` : '';

  async function call(items: Waiting[]): Promise<void> {
    const why = gate();
    if (why) { for (const w of items) w.reject(new KernelError(why, 403, 'gated')); return; }
    started++;   // counted before the call: a failed call is still a call against the cap, and nothing retries
    const prompt = buildCodexPrompt(items.map(w => w.request)), dir = mkdtempSync(join(tmpdir(), 'rw-codex-')), cwd = join(dir, 'empty'), schema = join(dir, 'schema.json'), out = join(dir, 'out.json');
    mkdirSync(cwd);
    writeFileSync(schema, JSON.stringify(CODEX_SCHEMA));
    const t0 = performance.now();
    let output = '', error = '', raw = '';
    try {
      await new Promise<void>((resolve, reject) => {
        // no shell; standard input closed (the tool waits on an open one forever)
        const child = spawn(o.bin ?? CODEX_BIN, codexArgs(o, cwd, schema, out, prompt), { stdio: ['ignore', 'pipe', 'pipe'] });
        const kill = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`codex timed out after ${o.timeoutS ?? 300} s`)); }, (o.timeoutS ?? 300) * 1000);
        const keep = (b: Buffer) => { if (output.length < 200_000) output += b.toString(); };
        child.stdout.on('data', keep); child.stderr.on('data', keep);
        child.on('error', e => { clearTimeout(kill); reject(e); });
        child.on('close', code => { clearTimeout(kill); if (code === 0) resolve(); else reject(new Error(`codex exited with ${code}`)); });
      });
      raw = readFileSync(out, 'utf8');
    } catch (e) { error = e instanceof Error ? e.message : 'codex failed'; }
    rmSync(dir, { recursive: true, force: true });
    const seconds = (performance.now() - t0) / 1000, tokens = tokensUsed(output);
    const answers = error ? items.map(() => error) : readCodexAnswer(raw, items.map(w => w.request.options.length));
    const entry: CodexCall = { cases: items.length, seconds: Math.round(seconds * 100) / 100, tokens, promptChars: prompt.length, error };
    log.push(entry);
    o.onCall?.({ ...entry, prompt, raw });
    items.forEach((w, i) => {
      const a = answers[i];
      if (typeof a === 'string') w.reject(new KernelError(a, 502, 'codex'));
      else w.resolve({ ...a, latencyMs: seconds * 1000 / items.length, model: `codex${o.model ? `:${o.model}` : ''}` });
    });
  }
  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    while (queue.length) { const items = queue.splice(0, batch); chain = chain.then(() => call(items)); }
  };
  return {
    id: 'codex', label: `Codex (local command-line tool${o.model ? `, ${o.model}` : ''}${o.effort ? `, effort ${o.effort}` : ''}, batch ${batch})`, calls: () => [...log],
    decide(request) {
      const bad = wildRequestError(request);
      if (bad) return Promise.reject(new KernelError(`the Codex kernel takes wild packets only (${bad})`, 400, 'request'));
      return new Promise<KernelAnswer>((resolve, reject) => {
        queue.push({ request, resolve, reject });
        if (queue.length >= batch) flush(); else timer ??= setTimeout(flush, o.gatherMs ?? 25);
      });
    },
  };
}
