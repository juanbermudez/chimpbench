// Grooming choreography shots and readouts (stage W5, docs/staging/w5-grooming.md): the creature harness on a frozen
// page clock, so two builds are compared frame for frame, and grooming pairs filmed in the app on the field map.
// Needs a model-free dev server (never 5173): MGOGO_NO_MODEL=1 pnpm exec vite --host 127.0.0.1 --port 5181 --strictPort
// One headless Chrome, one page at a time. Read-only on the page's world: it reads state, presses the app's own keys
// and buttons and places the camera through the rig. After editing source, run a job once and discard it: Vite reloads
// the first page that meets a changed module, which can land in the middle of a capture.
// Usage: node scripts/groom-shots.mjs --out <dir> [--url http://127.0.0.1:5181] [--label after] [--seated-only] <job> [...]
//   Files go to <dir>/<label>/. Run once per build with --label before and --label after, then `tilesdiff`.
//   pose    mode=single&action=groom, each receiver posture (&groomee=0|2|3|4), side and above, six frames 3.7 s apart
//           -> one sheet each. --seated-only: a build without grooming v2 ignores &groomee, take the seated pair only.
//   wrist   wrist and head travel of both animals over 14 s of page time (50 ms steps) -> wrist.json
//   tiles   mode=tiles at page time 8 s, Math.random on a fixed sequence -> tiles.png, tiles.json (clip per animal)
//   cases   mother-and-infant grooming (&infant=), a mutual pair (&mutual=1), and with a lying posture forced: a receiver
//           cradling a dead infant (&deadinfant=1) or holding a living one (&heldinfant=), a grooming chain (&chain=1)
//           -> sheets, cases.json (ONLY=<part of a case name> runs some)
//   change  the receiver's first change into a lying posture in the harness's own timeline, six frames 0.35 s apart
//   scan    the app, field map, seed 48, paused: day 1 walked tick by tick; groomer-ticks by situation and the pairs that
//           groom without a break for 16 ticks or more -> scan.json
//   app     films the first two adult pairs, a mother grooming an infant in front of her and one grooming the infant she
//           holds from scan.json: 4 m orbit, Real time, six frames 3 s apart and the wrist travel over 14 s (ONLY=pair-a,...)
//   tilesdiff  per-tile pixel difference of <dir>/before/tiles.png against <dir>/after/tiles.png -> <dir>/tiles-diff.json
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const { chromium } = await import('./lib/playwright.mjs');
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const ROOT = opt('out', ''), S = opt('url', 'http://127.0.0.1:5181'), label = opt('label', 'after'), seatedOnly = argv.includes('--seated-only');
const jobs = argv.filter((a, i) => !a.startsWith('--') && !['--out', '--url', '--label'].includes(argv[i - 1]));
if (!ROOT || !jobs.length) { console.error('usage: node scripts/groom-shots.mjs --out <dir> [--url http://127.0.0.1:5181] [--label after] [--seated-only] <pose|wrist|tiles|cases|change|scan|app|tilesdiff> [...]'); process.exit(1); }
const H = `${S}/src/render/creatures/harness.html`;
const OUT = `${ROOT}/${label}`;
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
async function newPage(w, h) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`error: ${m.text().slice(0, 200)}`); });
  return page;
}
/** A harness page on a frozen clock: nothing animates until clock.runFor, so frames land on exact page times. */
async function frozenHarness(query, w, h, seeded = false) {
  const page = await newPage(w, h);
  // The effects layer (dust, leaves) draws from Math.random: a fixed sequence makes two loads pixel-identical.
  if (seeded) await page.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; });
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto(`${H}?${query}`, { waitUntil: 'load', timeout: 120000 });
  for (let i = 0; i < 300; i++) { if (await page.evaluate(() => !!(window.__creatures && window.__world))) break; await sleep(100); }
  await sleep(400);
  return page;
}
let sheetPage = null;
/** Contact sheet of PNG buffers (cols across), each cell cw x ch, numbered. */
async function sheet(bufs, file, cols, cw, ch, captions = []) {
  sheetPage ??= await newPage(400, 300);
  const urls = bufs.map(b => 'data:image/png;base64,' + b.toString('base64'));
  const data = await sheetPage.evaluate(async ([urls, cols, cw, ch, captions]) => {
    const imgs = await Promise.all(urls.map(u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; })));
    const rows = Math.ceil(imgs.length / cols);
    const c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch; const g = c.getContext('2d');
    imgs.forEach((im, i) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * ch; g.drawImage(im, x, y, cw, ch); g.font = 'bold 15px sans-serif'; g.fillStyle = '#000'; g.fillText(captions[i] ?? String(i), x + 7, y + 19); g.fillStyle = '#fff'; g.fillText(captions[i] ?? String(i), x + 6, y + 18); });
    return c.toDataURL('image/png');
  }, [urls, cols, cw, ch, captions]);
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  console.log('saved', file);
}
// Wrists (hand bones) and the label anchor above the head, world metres, with the drawn clip and role.
const READ = `(()=>__world.chimps.map(c=>{const f=__creatures.debug.feet(c.id),a=__creatures.debug.anim(c.id);return f&&a?{id:c.id,act:c.action,age:c.age,clip:a.clip,role:a.role,carry:a.carry,size:f.size,l:[f.contacts[0].x,f.contacts[0].y,f.contacts[0].z],r:[f.contacts[1].x,f.contacts[1].y,f.contacts[1].z],head:[a.head.x,a.head.y,a.head.z]}:null}).filter(Boolean))()`;
const POSTURES = [['sit', 0], ['prone', 2], ['side', 3], ['present', 4]];
const VIEWS = [['side', '0.2,1.0,3.3,0.45,0.45,0.15'], ['above', '0.45,5.5,3.6,0.45,0.3,0.15']];
const log = {};
const saveLog = name => { writeFileSync(`${OUT}/${name}.json`, JSON.stringify(log[name], null, 1)); console.log('saved', `${OUT}/${name}.json`); };

async function pose() {
  for (const [posture, v] of seatedOnly ? POSTURES.slice(0, 1) : POSTURES) for (const [view, cam] of VIEWS) {
    const page = await frozenHarness(`mode=single&action=groom&groomee=${v}&cam=${cam}`, 960, 600);
    await page.clock.runFor(6000);
    const bufs = [], caps = [];
    for (let k = 0; k < 6; k++) { await sleep(150); bufs.push(await page.screenshot()); caps.push(`${(6 + k * 3.7).toFixed(1)} s`); if (k < 5) await page.clock.runFor(3700); }
    await sheet(bufs, `${OUT}/pose-groom-${posture}-${view}.png`, 3, 640, 400, caps);
    await page.context().close();
  }
}
async function wrist() {
  log.wrist = { note: 'page time on a frozen clock: 6 s settle, then 280 steps of 50 ms (14 s). Ranges are max - min per world axis (x, y up, z) in cm; path is the summed step-to-step distance in cm.', runs: {} };
  for (const [name, query] of [['default', 'mode=single&action=groom'], ...(seatedOnly ? [] : POSTURES.map(([p, v]) => [p, `mode=single&action=groom&groomee=${v}`]))]) {
    const page = await frozenHarness(query, 800, 500);
    await page.clock.runFor(6000);
    const acc = {};
    for (let i = 0; i < 280; i++) {
      await page.clock.runFor(50);
      for (const s of await page.evaluate(READ)) {
        const a = acc[s.id] ??= { act: s.act, clip: s.clip, role: s.role, size: s.size, n: 0, min: { l: [9e9, 9e9, 9e9], r: [9e9, 9e9, 9e9], head: [9e9, 9e9, 9e9] }, max: { l: [-9e9, -9e9, -9e9], r: [-9e9, -9e9, -9e9], head: [-9e9, -9e9, -9e9] }, path: { l: 0, r: 0, head: 0 }, last: null, clips: new Set() };
        a.n++; a.clips.add(`${s.clip}/${s.role}`);
        for (const k of ['l', 'r', 'head']) { s[k].forEach((x, j) => { a.min[k][j] = Math.min(a.min[k][j], x); a.max[k][j] = Math.max(a.max[k][j], x); }); if (a.last) a.path[k] += Math.hypot(s[k][0] - a.last[k][0], s[k][1] - a.last[k][1], s[k][2] - a.last[k][2]); }
        a.last = s;
      }
    }
    const out = {};
    for (const id in acc) { const a = acc[id]; const rng = k => a.min[k].map((m, j) => +((a.max[k][j] - m) * 100).toFixed(1));
      out[id] = { act: a.act, clips: [...a.clips], size: +a.size.toFixed(2), samples: a.n, leftWristRangeCm: rng('l'), rightWristRangeCm: rng('r'), headRangeCm: rng('head'), leftWristPathCm: +(a.path.l * 100).toFixed(1), rightWristPathCm: +(a.path.r * 100).toFixed(1), headPathCm: +(a.path.head * 100).toFixed(1) }; }
    log.wrist.runs[name] = { url: `${H}?${query}`, animals: out };
    console.log(name, JSON.stringify(out));
    await page.context().close();
  }
  saveLog('wrist');
}
async function tiles() {
  const page = await frozenHarness('mode=tiles', 1800, 1500, true);
  await page.clock.runFor(8000);
  await sleep(300);
  await page.screenshot({ path: `${OUT}/tiles.png` });
  log.tiles = { url: `${H}?mode=tiles`, pageTimeS: 8, animals: (await page.evaluate(READ)).map(s => ({ id: s.id, act: s.act, clip: s.clip, role: s.role, carry: s.carry })) };
  saveLog('tiles');
  console.log('saved', `${OUT}/tiles.png`);
  await page.context().close();
}
async function tilesdiff() {
  const ACTIONS = ['rest', 'forage', 'drink', 'travel', 'groom', 'play', 'follow', 'climb', 'patrol', 'display', 'flee', 'hunt', 'mate', 'nurse', 'dead', 'nest', 'pant-grunt', 'charge', 'attack', 'submit', 'reconcile', 'console', 'share', 'beg', 'guard', 'consort', 'shelter', 'call', 'transfer', 'alarm'];
  const page = await newPage(400, 300);
  const res = await page.evaluate(async ([ua, ub, n]) => {
    const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(ua), load(ub)]);
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
    g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
    const cols = 6, rows = Math.ceil(n / cols), tw = Math.floor(c.width / cols), th = Math.floor(c.height / rows), out = [];
    for (let t = 0; t < n; t++) { const x0 = (t % cols) * tw, y0 = Math.floor(t / cols) * th; let sum = 0, diff = 0, max = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
      for (let y = y0; y < y0 + th; y++) for (let x = x0; x < x0 + tw; x++) { const p = (y * c.width + x) * 4; const d = Math.max(Math.abs(da[p] - db[p]), Math.abs(da[p + 1] - db[p + 1]), Math.abs(da[p + 2] - db[p + 2])); sum += d; if (d > 0) { diff++; bx0 = Math.min(bx0, x - x0); by0 = Math.min(by0, y - y0); bx1 = Math.max(bx1, x - x0); by1 = Math.max(by1, y - y0); } if (d > max) max = d; }
      out.push({ pixels: tw * th, differing: diff, maxDiff: max, meanAbs: +(sum / (tw * th)).toFixed(4), ...(diff ? { boxInTile: [bx0, by0, bx1, by1] } : {}) }); }
    return { size: [c.width, c.height], sameSize: ia.width === ib.width && ia.height === ib.height, tiles: out };
  }, [`${ROOT}/before/tiles.png`, `${ROOT}/after/tiles.png`].map(f => 'data:image/png;base64,' + readFileSync(f).toString('base64')).concat([ACTIONS.length]));
  const rows = res.tiles.map((t, i) => ({ action: ACTIONS[i], ...t }));
  const clipsOf = f => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).animals : null;
  const ca = clipsOf(`${ROOT}/before/tiles.json`), cb = clipsOf(`${ROOT}/after/tiles.json`);
  const clipChanges = ca && cb ? cb.filter((b, i) => !ca[i] || ca[i].clip !== b.clip || ca[i].role !== b.role).map((b, i) => ({ id: b.id, act: b.act, before: ca.find(a => a.id === b.id), after: b })) : null;
  const out = { note: 'before/tiles.png against after/tiles.png, both at page time 8 s on a frozen clock with Math.random on a fixed sequence (the effects layer draws from it). differing = pixels whose largest channel difference is above 0 (of 255); boxInTile = their bounding box in the 300 x 300 tile. Each tile has its own camera, so a neighbouring tile\'s animals can stand in its background.', size: res.size, sameSize: res.sameSize, changedTiles: rows.filter(r => r.differing > 0).map(r => r.action), tiles: rows, clipChanges };
  writeFileSync(`${ROOT}/tiles-diff.json`, JSON.stringify(out, null, 1));
  console.log('changed tiles:', JSON.stringify(out.changedTiles), 'clip changes:', JSON.stringify(clipChanges));
  await page.context().close();
}
// Mother-and-infant cases and the two risks of the prototype, in the creature harness (options added in stage W5).
// Each is one page on the frozen clock: three frames 3.7 s apart and the drawn clip, role and carry state per animal.
const FRONT = '-1.5,1.2,1.9,-0.05,0.5,0.15';
// [name, harness options, camera, picture?]: the cases without a picture keep their readout in cases.json.
const CASES = [
  ['infant-0y3', 'infant=0.3', FRONT, false],                                    // carried: under 1.2 y
  ['infant-0y8', 'infant=0.8', FRONT, true],                                     // carried; on her back before W5
  ['infant-1y8-riding', 'infant=1.8&riding=1', FRONT, false],                    // the simulation's stacked position
  ['infant-1y8-nursing', 'infant=1.8&nursing=1', FRONT, true],                   // the review's case (Kiboro and Zamiko)
  ['infant-0y8-mutual', 'infant=0.8&mutual=1', FRONT, false],
  ['infant-2y5-ground', 'infant=2.5', '1.9,1.2,2.9,0.2,0.45,0.1', true],         // not carried: sits in front of her
  ['mutual', 'mutual=1', '0.2,1.0,3.3,0.45,0.45,0.15', true],                  // two adults grooming each other, face to face
  ['risk-dead-infant-forced-prone', 'groomee=2&deadinfant=1', '0.2,1.0,3.3,0.45,0.45,0.15', true],
  ['risk-held-infant-forced-prone', 'groomee=2&heldinfant=0.3', '0.2,1.0,3.3,0.45,0.45,0.15', true],
  ['risk-chain-forced-prone', 'groomee=2&chain=1', '0.6,1.3,4.6,0.9,0.45,0.3', true],
];
async function cases() {
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  log.cases = existsSync(`${OUT}/cases.json`) ? JSON.parse(readFileSync(`${OUT}/cases.json`, 'utf8')) : { runs: {} };
  for (const [name, opts, cam, picture] of CASES) {
    if (only && !only.some(o => name.includes(o))) continue;
    const query = `mode=single&action=groom&${opts}&cam=${cam}`;
    const page = await frozenHarness(query, 960, 600);
    await page.clock.runFor(6000);
    const bufs = [], caps = [], reads = [];
    for (let k = 0; k < 3; k++) { await sleep(150); bufs.push(await page.screenshot()); const r = await page.evaluate(READ); reads.push(r); caps.push(`${(6 + k * 3.7).toFixed(1)} s  ${r.map(s => `${s.clip}/${s.role}${s.carry ? ' carried' : ''}`).join('  ')}`); if (k < 2) await page.clock.runFor(3700); }
    if (picture) await sheet(bufs, `${OUT}/case-${name}.png`, 3, 640, 400, caps);
    log.cases.runs[name] = { url: `${H}?${query}`, frames: reads.map(fr => fr.map(s => ({ id: s.id, age: s.age, act: s.act, clip: s.clip, role: s.role, carry: s.carry, wristsAboveGroundCm: [Math.round(s.l[1] * 100), Math.round(s.r[1] * 100)], headAnchorCm: Math.round(s.head[1] * 100) }))) };
    console.log(name, JSON.stringify(log.cases.runs[name].frames[2]));
    await page.context().close();
  }
  saveLog('cases');
}

// A posture change of the receiver in the harness's own timeline (no forced posture): the first change into a lying
// posture within five minutes of page time, then six frames 0.35 s apart from just before it.
async function change() {
  const q = 'mode=single&action=groom&cam=0.4,1.5,3.9,0.45,0.4,0.15';
  let page = await frozenHarness(q, 960, 600);
  await page.clock.runFor(3000);
  const roles = []; let at = null;
  for (let i = 0; i < 3000 && at === null; i++) { await page.clock.runFor(100); const r = await page.evaluate(() => __creatures.debug.anim(1).role); if (roles.length && r !== roles[roles.length - 1][1]) { roles.push([3 + (i + 1) * 0.1, r]); if (r === 2 || r === 3) at = 3 + (i + 1) * 0.1; } else if (!roles.length) roles.push([3, r]); }
  await page.context().close();
  log.change = { url: `${H}?${q}`, receiverRoleChanges: roles.map(([t, r]) => ({ pageTimeS: +t.toFixed(1), role: r })), filmedFromS: at === null ? null : +(at - 0.4).toFixed(1) };
  if (at !== null) {
    page = await frozenHarness(q, 960, 600);
    await page.clock.runFor(Math.round((at - 0.4) * 1000));
    const bufs = [], caps = [];
    for (let k = 0; k < 6; k++) { await sleep(150); bufs.push(await page.screenshot()); const r = await page.evaluate(READ); caps.push(`${(at - 0.4 + k * 0.35).toFixed(2)} s  ${r.map(s => `${s.clip}/${s.role}`).join('  ')}`); if (k < 5) await page.clock.runFor(350); }
    await sheet(bufs, `${OUT}/pose-groom-change.png`, 3, 640, 400, caps);
    await page.context().close();
  }
  saveLog('change');
  console.log(JSON.stringify(log.change));
}

// --- The app on the field map (seed 48): grooming pairs on the ground at a 4 m orbit.
// Two passes, because the drawn bodies trail the simulation by two ticks and a jump of many ticks leaves stale path
// samples (an animal can be drawn where it was before the jump): `scan` walks one paused world tick by tick (the
// public tick, no decision pump; two loads paused at tick 1 reach the same world, checked by hash) and lists pairs
// that groom without a break for 16 ticks or more; `app` then opens a fresh page per pair, ticks to 6 ticks before
// the chosen moment, lets the app itself play up to it at 1 min/s, and films at Real time.
const APP = `${S}/?fresh=1&seed=48&provider=server&test=1`;
const SCAN = `(()=>{const cr=document.querySelector('canvas').__env.creatures;let live=[];const refresh=()=>{live=__MGOGO__.snapshot().chimps.map(s=>cr.debug.anim(s.id)?.chimp).filter(Boolean)};
  const T0=480,T1=2880,MIN=16;const t=__MGOGO__.snapshot().tick;if(t<T0)__MGOGO_TEST__.tick(T0-t);refresh();
  const open=new Map(),done=[],count={ticks:0,groomerTicks:0,oneWay:0,mutual:0,ownInfant:0,ownInfantCarried:0,receiverGroomsThird:0,receiverCarriesDead:0,receiverCarriesInfant:0,offGround:0,noPartnerInReach:0,receiverAct:{}};
  for(let T=__MGOGO__.snapshot().tick;T<T1;T++){__MGOGO_TEST__.tick(1);if(T%60===0)refresh();const by=new Map(live.map(c=>[c.id,c]));const seen=new Set();count.ticks++;
    for(const c of live){if(!c.alive||c.action!=='groom'||c.targetId<0||c.targetId>=100000)continue;const b=by.get(c.targetId);if(!b||!b.alive)continue;count.groomerTicks++;
      const d=Math.hypot(b.position[0]-c.position[0],b.position[2]-c.position[2]),ya=c.position[1]||0,yb=b.position[1]||0;
      const mutual=b.action==='groom'&&b.targetId===c.id,own=b.motherId===c.id&&b.age<4,third=b.action==='groom'&&b.targetId!==c.id,dead=(b.carryingDeadId??-1)>=0;
      const infant=live.some(k=>k.alive&&k.motherId===b.id&&k.age<1.2&&Math.hypot(k.position[0]-b.position[0],k.position[2]-b.position[2])<0.6);
      if(d>4.5||Math.abs(ya-yb)>1.5){count.noPartnerInReach++;continue}
      if(mutual)count.mutual++;else count.oneWay++;if(own)count.ownInfant++;if(third)count.receiverGroomsThird++;if(dead)count.receiverCarriesDead++;if(infant&&!own)count.receiverCarriesInfant++;if(ya>0.5||yb>0.5)count.offGround++;
      count.receiverAct[b.action]=(count.receiverAct[b.action]||0)+1;
      // As the renderer's carryMode reads it: an infant under 4 on its mother (riding above her, under 1.2 y, or nursing).
      const carried=own&&d<=2.5&&((yb>0.15&&d<0.6&&ya<yb)||b.age<1.2||b.action==='nurse');if(carried)count.ownInfantCarried++;
      const kind=carried?(ya<0.3?'carried':null):own?'infant':(!mutual&&!third&&!dead&&c.age>=12&&b.age>=12)?'adult':null;if(!kind||(kind!=='carried'&&(ya>0.3||yb>0.3))||d>2)continue;
      const key=c.id+'-'+b.id;seen.add(key);const r=open.get(key);if(r)r.last=__MGOGO__.snapshot().tick;else{const tk=__MGOGO__.snapshot().tick;open.set(key,{kind,id:c.id,name:c.name,age:+c.age.toFixed(1),sex:c.sex,tid:b.id,tname:b.name,tage:+b.age.toFixed(1),tsex:b.sex,troop:c.troopId,start:tk,last:tk})}}
    for(const [k,r] of open)if(!seen.has(k)){open.delete(k);if(r.last-r.start+1>=MIN)done.push(r)}}
  return {from:T0,to:T1,minTicks:MIN,count,windows:done.map(r=>({...r,ticks:r.last-r.start+1})),hashAtEnd:__MGOGO_TEST__.hash()}})()`;
const PAIR = (a, b) => `(()=>{const cr=document.querySelector('canvas').__env.creatures,A=cr.debug.anim(${a}),B=cr.debug.anim(${b}),fa=cr.debug.feet(${a}),fb=cr.debug.feet(${b});const W=__MGOGO__.snapshot();const w=f=>f?f.contacts.slice(0,2).map(k=>[+k.x.toFixed(3),+k.y.toFixed(3),+k.z.toFixed(3)]):null;
  return {tick:W.tick,hour:+W.hour.toFixed(3),a:{act:A.chimp.action,clip:A.clip,role:A.role,carry:A.carry,vis:A.visible,px:Math.round(A.px),y:+A.by.toFixed(2)},b:{act:B.chimp.action,clip:B.clip,role:B.role,carry:B.carry,vis:B.visible,y:+B.by.toFixed(2)},drawnGapM:+Math.hypot(A.bx-B.bx,A.bz-B.bz).toFixed(2),wristsA:w(fa),wristsB:w(fb)}})()`;
async function appPage() {
  const page = await newPage(1440, 900);
  await page.goto(APP, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__MGOGO__ && window.__MGOGO_TEST__ && window.__MGOGO__.snapshot().renderer && document.querySelector('canvas')?.__env?.creatures, null, { timeout: 180000 });
  const key = async k => { await page.evaluate(() => document.activeElement?.blur?.()); await page.keyboard.press(k); };
  const snap = () => page.evaluate(() => { const s = __MGOGO__.snapshot(); return { tick: s.tick, hour: +s.hour.toFixed(3), day: s.day, playing: s.clock.playing, speed: s.clock.speedId, sel: s.selectedId, view: s.view, policy: s.model.policy, roster: s.model.roster }; });
  await key(' '); // paused at once: two loads then hold the same world
  await page.waitForTimeout(9000);
  let loaded = await snap();
  if (loaded.playing) { await key(' '); await page.waitForTimeout(300); loaded = await snap(); }
  return { page, key, snap, loaded };
}
async function scan() {
  const { page, loaded } = await appPage();
  const r = await page.evaluate(SCAN);
  log.scan = { url: APP, loaded, ...r };
  log.scan.note = `ticks ${r.from} to ${r.to} of day 1 (08:30 to 18:30), paused world, public tick only. count: groomer-ticks by situation. windows: one-way pairs on the ground within 2 m that groom without a break for ${r.minTicks} ticks or more (kind adult: both 12 or older, the receiver neither grooming nor carrying a dead infant; kind infant: a mother grooming her own infant under 4 that sits on the ground; kind carried: a mother on the ground grooming her own infant while the renderer draws it carried on her).`;
  saveLog('scan');
  console.log(JSON.stringify(r.count), 'windows', r.windows.length, r.windows.slice(0, 12).map(w => `${w.kind}:${w.name}>${w.tname}@${w.start}+${w.ticks}`).join(' '), r.hashAtEnd);
  await page.context().close();
}
async function app() {
  const sc = JSON.parse(readFileSync(`${OUT}/scan.json`, 'utf8'));
  // With ONLY=<name,...> the named pairs are filmed again and the others' readouts are kept.
  const prior = existsSync(`${OUT}/app.json`) ? JSON.parse(readFileSync(`${OUT}/app.json`, 'utf8')).pairs : [];
  log.app = { url: APP, pairs: [] };
  // The first two adult windows that share no animal, and the first mother-and-infant window.
  const adults = []; for (const w of sc.windows.filter(w => w.kind === 'adult')) { if (adults.length < 2 && !adults.some(a => [a.id, a.tid].some(i => i === w.id || i === w.tid))) adults.push(w); }
  const picks = [...adults.map((w, i) => [`pair-${'ab'[i]}`, w]), ...sc.windows.filter(w => w.kind === 'infant').slice(0, 1).map(w => ['pair-infant', w]), ...sc.windows.filter(w => w.kind === 'carried').slice(0, 1).map(w => ['pair-carried', w])];
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [name, w] of picks) {
    if (only && !only.includes(name)) { const keep = prior.find(r => r.name === name); if (keep) log.app.pairs.push(keep); continue; }
    const { page, key, snap, loaded } = await appPage();
    const Tc = w.start + 4; // four ticks into the bout: both have settled and at least twelve ticks remain
    await page.evaluate(n => __MGOGO_TEST__.tick(n), Tc - 6 - loaded.tick);
    const rec = { name, window: w, filmedFromTick: Tc, worldHashBeforePlay: await page.evaluate(() => __MGOGO_TEST__.hash()), frames: [] };
    await key('b'); await key('i'); await key('Shift+B'); // the three panels closed: the whole frame is the scene
    if ((await snap()).view !== 'close') { await key('c'); await page.waitForTimeout(300); }
    // The camera follows the groomer through the rig (no selection: selecting would hand the animal to the model roster).
    const cam = `(()=>{const env=document.querySelector('canvas').__env,cr=env.creatures,A=cr.debug.anim(${w.id}),B=cr.debug.anim(${w.tid});env.rig.followId=${w.id};const dx=B.chimp.position[0]-A.chimp.position[0],dz=B.chimp.position[2]-A.chimp.position[2];env.rig.setOrbit(4,0.32,Math.atan2(dx,-dz),true);return true})()`;
    await page.evaluate(cam);
    await page.evaluate(() => document.querySelector('[data-speed="1x"]').click());
    if (!(await snap()).playing) await key(' ');
    await page.waitForFunction(t => __MGOGO__.snapshot().tick >= t, Tc - 1, { timeout: 60000, polling: 30 });
    await page.evaluate(() => document.querySelector('[data-speed="rt"]').click());
    rec.atSwitch = await snap();
    await page.evaluate(cam);
    const tw = Date.now(); let ready = null;
    while (Date.now() - tw < 40000) { ready = await page.evaluate(PAIR(w.id, w.tid)); if (ready.a.clip === 'groom' && ready.b.clip !== 'sitIdle' && ready.drawnGapM < 2) break; await page.waitForTimeout(250); }
    rec.waitedMs = Date.now() - tw; rec.ready = ready;
    await page.evaluate(cam);
    await page.waitForFunction(() => { const e = document.querySelector('canvas')?.__env; return !e || !e.field || !e.field.stats.building; }, null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(4000);
    const bufs = [], caps = [];
    for (let k = 0; k < 6; k++) {
      const buf = await page.screenshot(); bufs.push(buf);
      if (k === 0) { writeFileSync(`${OUT}/app-${name}-frame0.png`, buf); console.log('saved', `${OUT}/app-${name}-frame0.png`); }
      const r = await page.evaluate(PAIR(w.id, w.tid)); rec.frames.push(r); caps.push(`${k * 3} s  ${w.name}: ${r.a.clip}/${r.a.role}   ${w.tname}: ${r.b.clip}/${r.b.role}`);
      if (k < 5) await page.waitForTimeout(3000);
    }
    await sheet(bufs, `${OUT}/app-${name}.png`, 3, 720, 450, caps);
    // The groomer's wrist travel over 14 s at Real time, sampled every 50 ms as in the harness readout.
    rec.wrist14s = await page.evaluate(`(async()=>{const cr=document.querySelector('canvas').__env.creatures;const ids=[${w.id},${w.tid}],acc={};const t0=performance.now();while(performance.now()-t0<14000){for(const id of ids){const f=cr.debug.feet(id);if(!f)continue;const a=acc[id]??={clip:new Set(),n:0,min:[[9e9,9e9,9e9],[9e9,9e9,9e9]],max:[[-9e9,-9e9,-9e9],[-9e9,-9e9,-9e9]]};a.n++;a.clip.add(f.clip);for(let h=0;h<2;h++){const k=f.contacts[h];[k.x,k.y,k.z].forEach((v,i)=>{a.min[h][i]=Math.min(a.min[h][i],v);a.max[h][i]=Math.max(a.max[h][i],v)})}}await new Promise(r=>setTimeout(r,50))}
      const out={};for(const id in acc){const a=acc[id];out[id]={clips:[...a.clip],samples:a.n,leftWristRangeCm:a.min[0].map((v,i)=>+((a.max[0][i]-v)*100).toFixed(1)),rightWristRangeCm:a.min[1].map((v,i)=>+((a.max[1][i]-v)*100).toFixed(1))}}return {tickAtEnd:__MGOGO__.snapshot().tick,animals:out}})()`);
    log.app.pairs.push(rec);
    console.log(name, JSON.stringify({ window: w, hash: rec.worldHashBeforePlay, waitedMs: rec.waitedMs, clips: rec.frames.map(f => `${f.tick}:${f.a.clip}/${f.a.role}+${f.b.clip}/${f.b.role}`), wrist: rec.wrist14s }));
    await page.context().close();
  }
  saveLog('app');
}
const JOBS = { pose, wrist, tiles, tilesdiff, cases, change, scan, app };
try { for (const j of jobs) { if (!JOBS[j]) { console.log('unknown job', j); continue; } await JOBS[j](); } }
finally { await browser.close(); if (errors.length) console.log([...new Set(errors)].slice(0, 10).join('\n')); }
