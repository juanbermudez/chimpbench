// Stage C7e declared calibration (docs/staging/c7b-prereg.md §9): grid over goalDistScaleM, scored against the Taï
// development rows of scripts/compare-movement.ts (straightness 0.50, turning 0.76 rad, path rate 314 m/h) with
// L = ⅓ Σ ((sim − real) / real)². Development seeds only; the Gombe held-out validation is not touched.
//   pnpm exec tsx scripts/fit-goal-dist.ts [--grid 0,50,100,200,400,800,1600,3200] [--seeds 3909,4010] [--extra '{"id":v}'] [--tag name]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const grid = flag('grid', '0,50,100,200,400,800,1600,3200').split(',').map(Number);
const seeds = flag('seeds', '3909,4010'), extra = JSON.parse(flag('extra', '{}')) as Record<string, number>, tag = flag('tag', 'grid');
const OUT = 'artifacts/validation/c7e';
const TARGET = { straight: 0.5, turn: 0.76, pathRate: 314 } as const;
mkdirSync(OUT, { recursive: true });

const rows: { D: number; straight: number; turn: number; pathRate: number; loss: number; party: number; stepM: number }[] = [];
for (const D of grid) {
  const dir = `${OUT}/cm-${tag}-${D}`;
  const params = JSON.stringify({ ...extra, goalDistScaleM: D });
  execFileSync('pnpm', ['exec', 'tsx', 'scripts/compare-movement.ts', '--seeds', seeds, '--years', '0.25', '--burn-in', '60', '--workers', '2', '--params', params, '--out', dir, '--guide', `${dir}/guide.json`], { stdio: ['ignore', 'ignore', 'inherit'] });
  const res = JSON.parse(readFileSync(`${dir}/result.json`, 'utf8')) as { scorecard: { id: string; sim: { value: number } }[] };
  const v = (id: string) => res.scorecard.find(r => r.id === id)?.sim.value ?? NaN;
  const s = { straight: v('straight'), turn: v('turn'), pathRate: v('pathRate') };
  const loss = (((s.straight - TARGET.straight) / TARGET.straight) ** 2 + ((s.turn - TARGET.turn) / TARGET.turn) ** 2 + ((s.pathRate - TARGET.pathRate) / TARGET.pathRate) ** 2) / 3;
  rows.push({ D, ...s, loss, party: v('party'), stepM: v('stepM') });
  console.error(`D ${D}: straightness ${s.straight.toFixed(3)}, turning ${s.turn.toFixed(3)}, path ${s.pathRate.toFixed(0)} m/h → L ${loss.toFixed(4)}`);
}
const md = ['| goalDistScaleM (m) | Straightness | Turning (rad) | Path (m/h) | Loss | Party (C12) |', '| --- | --- | --- | --- | --- | --- |',
  ...rows.map(r => `| ${r.D === 0 ? 'off' : r.D} | ${r.straight.toFixed(3)} | ${r.turn.toFixed(3)} | ${r.pathRate.toFixed(0)} | ${r.loss.toFixed(4)} | ${r.party.toFixed(2)} |`)].join('\n');
console.log(`Seeds ${seeds}; extra ${JSON.stringify(extra)}; targets Taï straightness 0.50, turning 0.76 rad, path 314 m/h.\n\n${md}`);
writeFileSync(`${OUT}/fit-${tag}.json`, JSON.stringify({ seeds, extra, target: TARGET, rows }, null, 1));
writeFileSync(`${OUT}/fit-${tag}.md`, md + '\n');
