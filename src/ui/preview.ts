import '../style.css';
import type { InterventionKind, Stimulus } from '../types';
import type { ClockView, SpeedPresetView, UiDeps } from './contracts';
import { createApp } from './app';
import { syntheticDecider, syntheticRelation, syntheticWorld } from './synthetic';

// Preview harness: the full UI over a synthetic world, no simulation, decision
// loop or WebGL. Open /src/ui/preview.html?tab=mind&society=kinship&side=model (full=1: the full-screen society view).
// The forest is replaced by a painted backdrop so glass panels can be judged.

const world = syntheticWorld();
const decider = syntheticDecider(world);
const presets: SpeedPresetView[] = [
  { id: '1x', label: '1×', ecoSecondsPerSecond: 60 }, { id: '10x', label: '10×', ecoSecondsPerSecond: 600 }, { id: '1h', label: '1 h/s', ecoSecondsPerSecond: 3600 },
  { id: '6h', label: '6 h/s', ecoSecondsPerSecond: 21600 }, { id: '1d', label: '1 day/s', ecoSecondsPerSecond: 86400 }, { id: 'max', label: 'Max', ecoSecondsPerSecond: Infinity },
];
const clock: ClockView = { playing: true, speedId: '1x', ecoSecondsPerSecond: 60, ticksPerSecond: 4, effectiveRate: 60, limited: false, blockedByModel: false };
const params = new URLSearchParams(location.search);
if (params.get('limited')) { clock.speedId = 'max'; clock.ecoSecondsPerSecond = Infinity; clock.limited = true; clock.effectiveRate = 51000; clock.ticksPerSecond = 3400; }
if (params.get('blocked')) { world.modelPolicy.mode = 'lockstep'; clock.blockedByModel = true; clock.effectiveRate = 12; clock.ticksPerSecond = 0.8; }
let nextStim = 100;
const deps: UiDeps = {
  getWorld: () => world, clock, speedPresets: presets, decider, getScene: () => null,
  setSpeed(id) { const p = presets.find(x => x.id === id)!; clock.speedId = id; clock.ecoSecondsPerSecond = p.ecoSecondsPerSecond; clock.limited = !Number.isFinite(p.ecoSecondsPerSecond); clock.effectiveRate = Number.isFinite(p.ecoSecondsPerSecond) ? p.ecoSecondsPerSecond : 51000; clock.ticksPerSecond = clock.effectiveRate / 15; },
  setPlaying(p) { clock.playing = p; },
  setPolicy(mode) { world.modelPolicy.mode = mode; decider.enabled = mode !== 'off'; },
  setRoster(roster, selectedId) { decider.roster = roster; const ids = roster === 'all' ? world.chimps.filter(c => c.alive).map(c => c.id) : roster === 'focal-set' ? [selectedId, ...world.troops.map(t => t.alphaId)] : [selectedId]; decider.focalIds = ids; for (const c of world.chimps) c.controller = ids.includes(c.id) ? 'model' : 'rules'; },
  async retryModel() { decider.phase = 'loading'; setTimeout(() => { decider.phase = 'ready'; decider.ready = true; }, 1500); },
  applyIntervention(kind: InterventionKind, o) {
    const s: Stimulus = { id: nextStim++, kind, position: o.position ?? [0, 0, 0], radius: kind === 'remove-alpha' ? 0 : 30, start: world.time, end: world.time + 2, troopId: o.troopId ?? 1, label: kind };
    world.stimuli.push(s); world.events.push({ time: world.time, kind: 'system', text: `Experiment: ${kind}`, actors: [], troopId: s.troopId, severity: 2 }); return s;
  },
  relationOf: syntheticRelation, newWorld() {}, setQuality() {}, guideUrl: '/about',
};
const app = createApp(document.getElementById('app')!, deps);
app.ready();
const tab = params.get('tab'); if (tab) app.ctx.setTab(tab as never);
const soc = params.get('society'); if (soc) { app.state.society.view = soc as never; const tr = params.get('troop'); app.ctx.openSociety(tr && tr !== 'all' ? Number(tr) : undefined); if (params.get('full')) app.ctx.openSocietyFull(); }
const dock = params.get('dock') ?? params.get('side'); if (dock) app.ctx.setSide(dock as never);
if (params.get('hl')) app.ctx.highlight(Number(params.get('hl')));
if (params.get('night')) { world.hour = 22.3; world.environment.daylight = 0; world.environment.weather = 'clear'; world.environment.rain = 0; }
if (params.get('exp')) app.ctx.fireExperiment('playback-stranger');
(window as unknown as { __UI__: unknown }).__UI__ = app;
let prev = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - prev) / 1000); prev = now;
  if (clock.playing && !params.get('freeze')) { const h = (dt * clock.effectiveRate) / 3600; world.time += h; world.hour = (world.hour + h) % 24; }
  app.tick(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
