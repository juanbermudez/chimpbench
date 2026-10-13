// Stage R14: select by visible state first, then label during a second exact receipt replay.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { optionKey } from '../src/kernel/decode';
import { candidateMeta, computeCandidates } from '../src/sim/candidates';
import { buildRequest } from '../src/sim/request';
import { rgMenu } from '../src/sim/rg';
import { ix } from '../src/sim/state';
import type { Candidate, Chimp, World } from '../src/types';
import type { KernelRequest } from '../src/kernel/types';
import { classOf, familyOf } from './em-sample';
import { splitOf } from './r4-contexts';
import { labelData, REDRAWS, SAME_MIN } from './r11-contexts';
import { traceRun } from './lib/r14-trace';
import { hash, selectRows, stateOf, stratumOf, type SelectionRow } from './lib/r14';
import { packetOf } from './lib/r11-packets';
import { dayName, keyOf, readLines, readReceipts, readRegistry, sha16, type Row } from './lib/r10-run';
import type { R11Row } from './r11-assemble';
import type { R8Option } from './r8-contexts';

export async function collect(root: string, out: string, dry = false): Promise<void> {
  if (existsSync(out)) throw new Error(`refuse overwrite ${out}`);
  const reg = readRegistry(root), rules = reg.kernel === 'rules', source = rules ? 'rules' : 'learner';
  if (![48, 7, 21].includes(reg.seed) || reg.packetName !== 'p5b') throw new Error('R14 collection: only P5b worlds 48, 7 and 21');
  if (!dry && (reg.profile !== 'field' || reg.burnInDays !== 30 || reg.paramsFile !== 'docs/staging/integrator-kit/params/M6-W50.json' || reg.paramsSha256 !== hash(readFileSync(resolve(reg.paramsFile), 'utf8')) || reg.switches.observeV5 !== 1 || reg.switches.menuParity !== 1)) throw new Error('wrong collection world');
  if (!dry && (!reg.stopCheckOn || reg.stopCheck?.stop || reg.minAge !== 8 || reg.timeoutS !== 120 || (rules ? reg.arm !== 'rules' : !reg.contexts || reg.decodeSpec?.hold !== 'act'))) throw new Error('collection safety settings differ');
  if (!rules && !dry && (reg.arm !== `r14-source-s${reg.seed === 7 ? 11 : 7}-draw-1` || reg.switches.kernelGate !== 1 || reg.decodeSpec?.mode !== 'draw' || reg.decodeSpec?.salt !== 1)) throw new Error('wrong source policy');
  if ((!dry && (reg.days.length !== 10 || reg.state !== 'done')) || reg.days.some(d => d.timeouts > 0)) throw new Error('collection must finish all days without timeouts');
  if (!dry) {
    const identity: { commit: string; adapters: { name: string; weights: string }[] } = JSON.parse(readFileSync(resolve(out, '../../identity.json'), 'utf8'));
    if (reg.commit !== identity.commit) throw new Error('collection checkout differs from chain identity');
    if (!rules && (reg.adapter !== `r11-p5b-s${reg.seed === 7 ? 11 : 7}` || !identity.adapters.some(a => a.name === reg.adapter && a.weights === reg.adapterSha256))) throw new Error('collection adapter differs from pinned source');
  }
  const asks = new Map(readReceipts(root, reg.days.length).filter(l => l.k === 'ask').map(l => [keyOf(l.t, l.id, l.v), l]));
  type Point = SelectionRow & { state: ReturnType<typeof stateOf> };
  const points: Point[] = [], skipped: Record<string, number> = {}, labelled: object[] = [];
  let selected = new Map<string, Point>(), phase: 'select' | 'label' = 'select', count = 0;
  const skip = (s: string) => { skipped[s] = (skipped[s] ?? 0) + 1; };
  function visit(w: World, c: Chimp, request: KernelRequest): void {
    if (request.options.length < 2) return;
    const ctx = request.context, packet = packetOf('p5b', ctx), sha = sha16(JSON.stringify(packet));
    const receipt = rules ? undefined : asks.get(keyOf(+ctx.time.toFixed(6), ctx.chimpId, ctx.version));
    if (!rules && (!receipt || !receipt.sha || receipt.sha !== sha)) throw new Error(`receipt/packet mismatch ${ctx.chimpId}:${ctx.version}`);
    const id = `r14:${source}:${reg.seed}:${w.tick}:${c.id}:${c.decisionVersion}`, day = Math.floor((w.time - reg.burnInDays * 24) / 24);
    const point: Point = { id, chimpId: c.id, day, split: splitOf(reg.seed, c.id), stratum: stratumOf(packet), state: stateOf(packet) };
    if (phase === 'select') { points.push(point); return; }
    const picked = selected.get(id);
    if (!picked) return;
    count++;
    const list = computeCandidates(w, c, []).slice(), menu = rgMenu(w, c, list), opts = request.options;
    if (menu.length !== opts.length || menu.some(k => !opts.some(o => optionKey(o) === optionKey(k) && o.score === k.score))) throw new Error(`teacher/request menu mismatch ${id}`);
    const options: R8Option[] = opts.map((k, i) => { const live = list.find(o => optionKey(o) === optionKey(k)), m = live ? candidateMeta.get(live) : undefined;
      return { alias: `c${i}`, action: k.action, targetId: k.targetId, variant: String(m?.v ?? 0), family: familyOf(k.action, m?.v ?? 0, m?.aux ?? -1), score: k.score }; });
    const best = opts.reduce((b, o, i) => o.score > opts[b].score ? i : b, 0), beforeRng = w.rng, beforeVersion = c.decisionVersion;
    const top = menu.find(k => optionKey(k) === optionKey(opts[best]));
    if (!top) throw new Error('top option missing');
    const lab = labelData({ id, options, rgIndex: best }, { w, c, list, menu, chosen: top, rngBefore: w.rng }, dry ? { min: 20, target: 5, max: 100 } : REDRAWS);
    if (w.rng !== beforeRng || c.decisionVersion !== beforeVersion) throw new Error('labeling mutated random state or decision version');
    if (typeof lab === 'string') { skip(`${point.split}:${point.stratum}:${lab}`); return; }
    if (!lab.listOk) throw new Error(`candidate reconstruction failed ${id}`);
    if (lab.same < (dry ? 1 : SAME_MIN)) { skip(`${point.split}:${point.stratum}:too-few-matching-menus`); return; }
    const probs = lab.counts.map(n => n / lab.same), pick = probs.reduce((b, p, i) => p > probs[b] ? i : b, 0);
    const act = { action: c.action, targetId: c.targetId, seconds: c.actionTime, finished: ix(c).finished, onMenu: opts.some(k => k.action === c.action && k.targetId === c.targetId) };
    const row: R11Row = { id, split: point.split, seed: reg.seed, base: 'W50', tick: w.tick, time: w.time, hour: w.hour, phase: ctx.environment.phase,
      chimpId: c.id, cls: classOf(c), age: c.age, sex: c.sex, why: 'counterfactual teacher at a fresh ask', label: 'fresh', rgIndex: pick, pick: `c${pick}`, rulesIndex: request.rulesIndex,
      soft: Object.fromEntries(probs.map((p, i) => [`c${i}`, p])), redraws: lab.n, sameMenu: lab.same,
      options: options.map(({ alias, action, targetId, family }) => ({ alias, action, targetId, family })), act,
      carryOn: act.finished ? -1 : options.findIndex(k => k.action === c.action && k.targetId === c.targetId), packet, tokens: 0 };
    labelled.push({ ...row, source, stratum: point.stratum, state: point.state, day, selectedVia: picked.selectedVia, packetSha256: hash(JSON.stringify(packet)),
      checks: { menu: true, list: lab.listOk, rngUnchanged: true, realisedTeacherDraw: false } });
  }
  const replay = async () => traceRun(root, { onAsk: (w, c, r) => visit(w, c, r), onRules: (w, c, _list: Candidate[], _menu, _chosen, _why) => {
    const request = buildRequest(w, c); visit(w, c, request);
  }, log: console.log });
  const first = await replay();
  if (!first.ok) throw new Error('selection replay differs');
  let chosen = selectRows(points, source);
  if (dry) chosen = chosen.slice(0, 8);
  selected = new Map(chosen.map(p => [p.id, p])); phase = 'label';
  const second = await replay();
  if (!second.ok || count !== selected.size) throw new Error(`label replay differs, found ${count}/${selected.size}`);
  const cohort = new Set(first.animals.map(c => c.id));
  const animalNights = reg.days.reduce((n, d) => n + readLines<Row>(resolve(root, 'rows', `${dayName(d.day)}.jsonl`)).filter(r => cohort.has(r.id) && r.alive && r.nestShare !== null).length, 0);
  mkdirSync(resolve(out, '..'), { recursive: true });
  const text = labelled.map(x => JSON.stringify(x)).join('\n') + '\n';
  writeFileSync(out, text, { flag: 'wx' });
  writeFileSync(`${out}.meta.json`, JSON.stringify({ stage: 'R14', dry, source, seed: reg.seed, run: root, runCommit: reg.commit,
    runHash: hash(readFileSync(resolve(root, 'run.json'), 'utf8')), dataSha256: hash(text), days: reg.days.length, selected: chosen,
    animalNights, available: points.length, availableStates: { dawnNest: points.filter(p => p.state.nest && p.state.dawn).length, companyDuskNest: points.filter(p => p.state.nest && p.state.dusk && p.state.companyNest).length }, animals: new Set(points.map(p => p.chimpId)).size, labelled: labelled.length, skipped, replay: { selection: first.ok, labels: second.ok, hashes: second.hashes } }, null, 1) + '\n');
  console.log(JSON.stringify({ source, seed: reg.seed, selected: chosen.length, labelled: labelled.length, skipped }));
}
if (process.argv[1]?.endsWith('r14-collect.ts')) {
  const args = process.argv.slice(2), [root, out] = args;
  if (!root || !out) throw new Error('r14-collect.ts RUN OUT.jsonl [--dry]');
  await collect(resolve(root), resolve(out), args.includes('--dry'));
}
