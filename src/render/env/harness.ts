import * as THREE from 'three';
import * as sim from '../../simulation';
import { createScene } from '../../scene';
import type { Environment, Quality, ViewMode, World } from '../../types';
import { solarPosition } from './shared';

// Environment test page: ?hour=6.5&rain=0.8&cloud=0.9&weather=storm&wind=1&view=close|rts|cinematic
// &quality=high|medium|low&seed=48&pause=1&territory=1&canopy=0&hud=0&focus=<chimpId>&zoom=2&x=..&z=..&t=<frozen seconds>
// &profile=field: the real-metre world (C5b; the strategy view opens on the whole map, &strat=1 zooms onto the focus)
// Query overrides are re-applied after every sim step so screenshots are deterministic in lighting.

const q = new URLSearchParams(location.search);
const num = (key: string) => (q.has(key) ? Number(q.get(key)) : undefined);
const api = sim as unknown as { createWorld(seed?: number, opts?: { profile?: 'compressed' | 'field' }): World; tickWorld?: (w: World) => void; stepWorld?: (w: World, dt: number) => void };
const world = api.createWorld(num('seed') ?? 48, q.get('profile') === 'field' ? { profile: 'field' } : {});
const defaults: Environment = {
  weather: 'clear', rain: 0, cloud: 0.25, wind: 0.25, humidity: 0.8, temperature: 22, lightningAt: -1, season: 'wet',
  dayOfYear: 271, daylight: 1, sunAltitude: 1, sunAzimuth: 1.5, moonPhase: 0.5, fruitIndex: 0.5,
};
if (!(world as Partial<World>).environment) (world as World).environment = { ...defaults };
const solar = { alt: 0, az: 0 };
function override() {
  const env = world.environment;
  const hour = num('hour');
  if (hour !== undefined) {
    world.hour = hour;
    solarPosition(hour, env.dayOfYear ?? 271, solar);
    env.sunAltitude = solar.alt; env.sunAzimuth = solar.az;
    env.daylight = Math.min(1, Math.max(0, (solar.alt * 180 / Math.PI + 7) / 14));
  }
  if (q.has('rain')) env.rain = num('rain')!;
  if (q.has('cloud')) env.cloud = num('cloud')!;
  if (q.has('wind')) env.wind = num('wind')!;
  if (q.has('moon')) env.moonPhase = num('moon')!;
  if (q.has('weather')) env.weather = q.get('weather') as Environment['weather'];
  if (q.has('humidity')) env.humidity = num('humidity')!;
}
// &advance=<hours>: run the simulation forward before rendering (animals off their nests, parties formed).
const advance = num('advance') ?? 0;
for (let t = 0; t < advance * 240; t++) { if (api.tickWorld) api.tickWorld(world); else api.stepWorld?.(world, 0.25); }
override();

const container = document.getElementById('view')!;
const scene = createScene(container, world, id => console.info('selected', id));
const view = (q.get('view') ?? 'rts') as ViewMode;
if (q.has('quality')) scene.setQuality(q.get('quality') as Quality);
if (q.get('territory') === '1') scene.setLayer('territory', true);
if (q.get('canopy') === '0') scene.setLayer('canopy', false);
const focus = num('focus') ?? world.chimps.find(c => c.alive)?.id ?? null;
scene.setView(view);
if (view === 'close' && focus !== null) scene.focusChimp(focus);
if (q.has('x') && q.has('z')) scene.panTo(num('x')!, num('z')!);
if (q.get('strat') === '1' && view === 'rts' && focus !== null) scene.focusChimp(focus);

// Optional fixed camera for composition checks: &cam=x,y,z&look=x,y,z (close view controls are re-targeted).
if (q.has('cam') && q.has('look')) {
  const [cx, cy, cz] = q.get('cam')!.split(',').map(Number);
  const [lx, ly, lz] = q.get('look')!.split(',').map(Number);
  const envHandle = (container.querySelector('canvas') as HTMLCanvasElement & { __env: { rig: { place(cx: number, cy: number, cz: number, lx: number, ly: number, lz: number): void } } }).__env;
  envHandle.rig.place(cx, cy, cz, lx, ly, lz);
}
if (q.get('auto') === '0') (container.querySelector('canvas') as HTMLCanvasElement & { __env: { debug: { autoQuality: boolean } } }).__env.debug.autoQuality = false;
// &tonemap=aces|agx|neutral: output tone curve for A/B comparisons (the app ships ACES Filmic).
if (q.has('tonemap')) {
  const tm: Record<string, THREE.ToneMapping> = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping };
  (container.querySelector('canvas') as HTMLCanvasElement & { __env: { renderer: THREE.WebGLRenderer } }).__env.renderer.toneMapping = tm[q.get('tonemap')!] ?? THREE.ACESFilmicToneMapping;
}
if (q.has('insets')) { const [left, right, top, bottom] = q.get('insets')!.split(',').map(Number); scene.setInsets?.({ left, right, top, bottom }); }
const paused = q.get('pause') === '1';
const hud = document.getElementById('hud')!;
if (q.get('hud') === '0') hud.style.display = 'none';
let last = performance.now();
let elapsed = 0;
let acc = 0;
let hudAt = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  elapsed += dt;
  // &t=<seconds>: freeze the visual clock (wind sway, grain, animation) for pixel-comparable screenshots.
  if (q.has('t')) elapsed = num('t')!;
  // &rate=<eco-seconds per real second> (60 = 1 min/s, 3600 = 1 h/s, 86400 = 1 day/s), in 15 s sim ticks.
  const rate = num('rate') ?? 60;
  if (!paused) {
    acc += dt * rate / 15;
    let n = 0;
    while (acc >= 1 && n++ < 400) { acc -= 1; if (api.tickWorld) api.tickWorld(world); else api.stepWorld?.(world, 0.25); }
    if (acc > 1) acc = 0;
  }
  if (!q.has('rate')) override(); else if (q.has('rain') || q.has('cloud')) { if (q.has('rain')) world.environment.rain = num('rain')!; if (q.has('cloud')) world.environment.cloud = num('cloud')!; }
  scene.update({ dt, elapsed, selectedId: focus, simRate: paused ? 0 : rate, highlightTroopId: num('troop') ?? null, subTick: paused ? 0 : Math.min(1, acc) });
  if (now - hudAt > 500) {
    hudAt = now;
    const d = scene.getDiagnostics();
    hud.textContent = `fps ${d.fps.toFixed(0)}  calls ${d.drawCalls}  tris ${(d.triangles / 1000).toFixed(0)}k  pts ${d.points}\nhour ${world.hour.toFixed(2)}  rain ${world.environment.rain.toFixed(2)}  cloud ${world.environment.cloud.toFixed(2)}`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
Object.assign(window, { __scene: scene, __world: world });
