// Stage M2 summary tables for the pre-registration (docs/staging/em-prereg.md "M2 results"), generated from
// artifacts/em/m2/report.json (scripts/em-report.ts): agreement, choice shares and the probe verdicts by the registered rule.
//
//   pnpm exec tsx scripts/em-summary.ts [--json artifacts/em/m2/report.json]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const R = JSON.parse(readFileSync(resolve(arg('json', 'artifacts/em/m2/report.json')), 'utf8'));
const providers = ['base', 'baseline', 'jev'].filter(p => R[p]);
const pct = (v: number) => `${(100 * v).toFixed(0)}%`, f3 = (v: number) => v.toFixed(3), pts = (v: number) => `${v >= 0 ? '+' : ''}${(100 * v).toFixed(1)}`;
const out: string[] = [];
out.push('| provider | draws | agree old | agree new | new − old, points (95% CI) | kept or arrived: old → new |', '|---|---|---|---|---|---|');
for (const p of providers) {
  const d = R[p].draws, k = R[p]['kept or arrived'];
  out.push(`| ${p} | ${d.n} | ${pct(d.old)} | ${pct(d.new)} | ${pts(d.diff)} (${pts(d.ci[0])}, ${pts(d.ci[1])}) | ${k.n ? `${pct(k.old)} → ${pct(k.new)} (n ${k.n})` : '–'} |`);
}
out.push('', `References: the rules' own value without its jitter and belief draw picks RG's option in ${pct(R.references.valueArgmax)} of draws; chance ${pct(R.references.chance)}.`, '');
const FAMS = ['feed', 'food-trip', 'social-move', 'rest', 'nest', 'drink', 'affiliative', 'greet', 'aggression'];
out.push(`| share of choices (draws) | rules | ${providers.map(p => `${p} old | ${p} new`).join(' | ')} |`, `|---|---|${providers.map(() => '---|---|').join('')}`);
for (const f of FAMS) {
  const s = (p: string, k: 'rules' | 'old' | 'new') => pct((R[p].share[k][f] ?? 0) / R[p].share.n);
  out.push(`| ${f} | ${s(providers[0], 'rules')} | ${providers.map(p => `${s(p, 'old')} | ${s(p, 'new')}`).join(' | ')} |`);
}
out.push('');
const verdict = (e: { delta: number; ci: number[] } | undefined) => !e ? '–' : e.ci[0] > 0 ? 'right' : e.ci[1] < 0 ? 'wrong' : 'none';
const probes = ['deficit', 'reserves', 'sleep', 'light', 'heat', 'water'];
out.push(`| probe: Δ target probability, high − low level (verdict) | ${providers.map(p => `${p} old | ${p} new | ${p} isolated`).join(' | ')} |`, `|---|${providers.map(() => '---|---|---|').join('')}`);
for (const pr of probes) {
  const cell = (p: string, obs: string) => { const e = R.probes?.[`${p}:${pr}:${obs}`]; return e ? `${f3(e.delta)} (${verdict(e)})` : '–'; };
  out.push(`| ${pr} | ${providers.map(p => `${cell(p, 'Old')} | ${cell(p, 'New')} | ${cell(p, 'Iso')}`).join(' | ')} |`);
}
const count = (p: string, obs: string, v: string) => probes.filter(pr => verdict(R.probes?.[`${p}:${pr}:${obs}`]) === v).length;
out.push('', `Right-way probes, old / new (consistent): ${providers.map(p => `${p} ${count(p, 'Old', 'right')} / ${count(p, 'New', 'right')}`).join('; ')}. Wrong-way in the new observation: ${providers.map(p => `${p} ${count(p, 'New', 'wrong')}`).join('; ')}; isolated fields with any significant response: ${providers.map(p => `${p} ${probes.filter(pr => verdict(R.probes?.[`${p}:${pr}:Iso`]) !== 'none').length}`).join('; ')}.`);
for (const p of providers) if (R[p].whichFood) { const w = R[p].whichFood; out.push(`Which food (exploratory): ${p} peaks on the higher-rate food option in ${pct(w.old)} old and ${pct(w.new)} new (the rules, choosing food, in ${pct(w.rulesHigher)}).`); }
console.log(out.join('\n'));
