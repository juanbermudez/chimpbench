// Acceptance scenes of docs/visual-plan.md §6, captured headless on the real GPU (like scripts/shot.mjs).
// Start no-model servers first (never 5173):
//   MGOGO_NO_MODEL=1 pnpm exec vite --host 127.0.0.1 --port 5190 --strictPort
//   MGOGO_NO_MODEL=1 pnpm exec vite --host 127.0.0.1 --port 5191 --strictPort --config src/render/creatures/vite.harness.config.ts
// Usage: node scripts/visual-scenes.mjs [--app http://127.0.0.1:5190] [--harness http://127.0.0.1:5191]
//        [--out artifacts/visual/after] [--only C1,C4,E5,A13] [--tonemap agx|neutral|aces]
// A13–A16 are the close-up detail scenes of docs/graphics-camera-plan.md §6.1 (DPR 2).
// Sequences are saved as numbered frames plus a <id>-sheet.png contact sheet. Runs scenes one at a time.
import { mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = await import('./lib/playwright.mjs');

const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const app = opt('app', 'http://127.0.0.1:5190'), harness = opt('harness', 'http://127.0.0.1:5191');
const out = opt('out', 'artifacts/visual/after');
const only = opt('only', '') ? new Set(opt('only').split(',')) : null;
const tonemap = opt('tonemap', '');
mkdirSync(out, { recursive: true });
const H = `${harness}/src/render/creatures/harness.html`, E = `${app}/src/render/env/harness.html`;
const tm = tonemap ? `&tonemap=${tonemap}` : '';
// Camera placement that works on builds with and without the G2 rig (rig.place snaps springs and pitch curve).
const PLACE = `const place=(e,cx,cy,cz,lx,ly,lz)=>{const r=e.rig;r.followId=null;if(r.place){r.place(cx,cy,cz,lx,ly,lz);return;}r.controls.minDistance=0.5;r.controls.target.set(lx,ly,lz);r.controls.object.position.set(cx,cy,cz);r.controls.update();};`;
const C9_JS = `(()=>{${PLACE}const w=__world,e=document.querySelector('canvas').__env;const c=w.chimps.find(x=>x.alive&&x.age>15&&x.position[1]<0.2&&['rest','forage','groom'].includes(x.action));const g=e.terrain.walkable(c.position[0],c.position[2]);place(e,c.position[0]+2.6,g+1.7,c.position[2]+2.6,c.position[0],g+0.7,c.position[2]);})()`;
// Close-up detail scenes A13–A16 (docs/graphics-camera-plan.md §6.1), captured at DPR 2.
const A13_JS = `(()=>{${PLACE}const e=document.querySelector('canvas').__env;let b=null;for(const c of __world.chimps){if(!c.alive||c.age<12||c.position[1]>0.3)continue;const a=e.creatures.debug.anim(c.id);if(a){b=a;break;}}if(!b)return false;const dx=Math.sin(b.heading),dz=Math.cos(b.heading);place(e,b.head.x+dx*2.2,b.head.y+0.2,b.head.z+dz*2.2,b.head.x,b.head.y-0.1,b.head.z);return true;})()`;
const TRUNK = `const T=e.vegetation.trunkList;let b=0;for(let i=0;i<T.length;i+=4)if(T[i+2]>T[b+2]&&Math.abs(T[i])<80&&Math.abs(T[i+1])<80)b=i;const g=e.terrain.height(T[b],T[b+1]);`;
const A14_JS = `(()=>{${PLACE}const e=document.querySelector('canvas').__env;${TRUNK}place(e,T[b]+T[b+2]+3,g+1.6,T[b+1]+0.8,T[b],g+2.2,T[b+1]);return true;})()`;
const A15_JS = `(()=>{${PLACE}const e=document.querySelector('canvas').__env;const L=e.vegetation.lobes;let b=0;for(let i=0;i<L.length;i+=5)if(Math.abs(L[i])<60&&Math.abs(L[i+2])<60&&L[i+1]<16&&L[i+3]>2.5){b=i;break;}place(e,L[b]+L[b+3]+2.5,L[b+1]+0.5,L[b+2],L[b],L[b+1],L[b+2]);return true;})()`;
const A16_JS = `(()=>{${PLACE}const e=document.querySelector('canvas').__env;${TRUNK}place(e,T[b]+T[b+2]+6,g+1.8,T[b+1]+6,T[b]+T[b+2]+6.5,g,T[b+1]+4.5);return true;})()`;

// [id, url, waitMs, frames, intervalMs, js]
const SCENES = [
  ['C1', `${H}?mode=tiles`, 7000, 1, 0],
  ['C2', `${H}?mode=faces`, 6000, 1, 0],
  ['C2-play', `${H}?mode=faces&mood=playful&vocal=laugh`, 6000, 1, 0],
  ['C2-scream', `${H}?mode=faces&mood=fearful&vocal=scream`, 6000, 1, 0],
  ['C2-panthoot', `${H}?mode=faces&vocal=pant-hoot`, 6000, 1, 0],
  ['C2-whimper', `${H}?mode=faces&vocal=whimper`, 6000, 1, 0],
  ['C3', `${H}?mode=stages`, 6000, 1, 0],
  ['C4', `${H}?mode=single&action=travel&moving=1&cam=0,1.3,4.2,0,0.35,0`, 5000, 10, 60],
  ['C5', `${H}?mode=single&action=charge&moving=1&cam=0.5,2.2,6.5,0,0.4,0`, 5000, 8, 100],
  ['C6', `${H}?mode=single&action=climb&cam=3,5,6,0.3,4.5,-0.6`, 5000, 6, 150],
  ['C7', `${H}?mode=single&action=nest&build=1`, 5000, 6, 150],
  ...['groom', 'play', 'attack', 'mate', 'reconcile', 'beg', 'nurse'].map(a => [`C8-${a}`, `${H}?mode=single&action=${a}`, 5000, 6, 150]),
  ['C9', `${E}?view=close&hud=0&advance=3&auto=0&pause=1&hour=11${tm}`, 7000, 1, 0, C9_JS],
  ['E1', `${E}?view=rts&hour=10&advance=3&auto=0&hud=0${tm}`, 9000, 1, 0],
  ['E2', `${E}?view=rts&hour=15&rain=0.9&cloud=1&weather=storm&wind=1&advance=3&auto=0&hud=0${tm}`, 8000, 10, 200],
  ['E3', `${E}?view=rts&hour=21.5&advance=3&auto=0&hud=0${tm}`, 8000, 1, 0],
  ['E4', `${E}?view=close&hour=9&advance=3&auto=0&hud=0${tm}`, 8000, 1, 0],
  ['E5', `${E}?view=close&hour=10&cam=33,4.5,33&look=41,0.3,25&advance=3&auto=0&hud=0${tm}`, 8000, 6, 150],
  ['E6', `${E}?view=close&hour=10&cam=33,4.5,33&look=41,0.3,25&rain=0.8&cloud=0.95&weather=rain&advance=3&auto=0&hud=0${tm}`, 8000, 1, 0],
  ['E7', `${E}?view=close&hour=18.3&cam=33,4.5,33&look=41,0.3,25&advance=3&auto=0&hud=0${tm}`, 8000, 1, 0],
  ['E8', `${E}?view=close&hour=10&cam=-10,14,-10&look=-15,0,-22&advance=3&auto=0&hud=0${tm}`, 8000, 1, 0],
  ['E10', `${E}?view=cinematic&hour=10&advance=3&auto=0&hud=0${tm}`, 12000, 1, 0],
  ['C12', `${E}?view=close&hour=10&pause=1&wind=1&cam=-30,22,40&look=-40,8,20&advance=3&auto=0&hud=0${tm}`, 7000, 5, 200],
  ['A13', `${E}?view=close&hour=10&advance=3&auto=0&hud=0&pause=1&t=12${tm}`, 7000, 1, 0, A13_JS, 2],
  ['A14', `${E}?view=close&hour=10&advance=3&auto=0&hud=0&pause=1&t=12${tm}`, 7000, 1, 0, A14_JS, 2],
  ['A15', `${E}?view=close&hour=10&advance=3&auto=0&hud=0&pause=1&t=12${tm}`, 7000, 1, 0, A15_JS, 2],
  ['A16', `${E}?view=close&hour=10&advance=3&auto=0&hud=0&pause=1&t=12${tm}`, 7000, 1, 0, A16_JS, 2],
];

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const log = {};
try {
  for (const [id, url, wait, frames, interval, js, dpr = 1] of SCENES) {
    if (only && !only.has(id) && !only.has(id.split('-')[0])) continue;
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(wait);
    if (js) { await page.evaluate(js); await page.waitForTimeout(1500); }
    const files = [];
    for (let f = 0; f < frames; f++) {
      const file = frames > 1 ? `${out}/${id}-${String(f).padStart(2, '0')}.png` : `${out}/${id}.png`;
      await page.screenshot({ path: file });
      files.push(file);
      if (interval && f < frames - 1) await page.waitForTimeout(interval);
    }
    if (frames > 1) {
      // Contact sheet: frames in a grid at 1/3 scale.
      const { readFileSync } = await import('node:fs');
      const urls = files.map(f => 'data:image/png;base64,' + readFileSync(f).toString('base64'));
      const sheet = await page.evaluate(async (urls) => {
        const imgs = await Promise.all(urls.map(u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; })));
        const cols = Math.min(5, imgs.length), rows = Math.ceil(imgs.length / cols), w = 480, h = 300;
        const c = document.createElement('canvas'); c.width = cols * w; c.height = rows * h;
        const g = c.getContext('2d');
        imgs.forEach((im, i) => { g.drawImage(im, (i % cols) * w, Math.floor(i / cols) * h, w, h); g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(String(i), (i % cols) * w + 6, Math.floor(i / cols) * h + 18); });
        return c.toDataURL('image/png');
      }, urls);
      writeFileSync(`${out}/${id}-sheet.png`, Buffer.from(sheet.split(',')[1], 'base64'));
    }
    log[id] = { files: files.length, errors: errors.slice(0, 5) };
    console.log(id.padEnd(12), frames, 'frame(s)', errors.length ? `errors: ${errors.slice(0, 3).join(' | ')}` : '');
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(`${out}/scenes.json`, JSON.stringify(log, null, 1));
