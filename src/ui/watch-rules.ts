import type { Chimp, World } from '../types';

// Stage W14 (17 October 2026): interface rules for the animal a user is watching. Pure: no DOM, nothing written to the
// World. Each rule was found wrong by looking at the app as a user gets it (docs/staging/w14-whole-scene.md).

/** Animals within this distance of the selected one count as its party for the dawn fast-forward (m): what the close view
 * opening on it shows. A drawing rule. */
export const WAKE_NEAR_M = 40;

/**
 * The animals whose waking ends the field map's dawn fast-forward: the selected animal's party and every animal within
 * WAKE_NEAR_M of it, of those asleep in a nest (act `nest`) when the fast-forward begins. Before, only the selected
 * animal was watched, four times a second: the rest of its party woke first and, at 10 min/s, was drawn dropping
 * 7 to 17 m from its nests in a frame or two; the user never saw the party rise.
 */
export function wakeWatch(world: World, sel: Chimp | undefined): Chimp[] {
  if (!sel) return [];
  const out: Chimp[] = [];
  for (const c of world.chimps) {
    if (!c.alive || c.action !== 'nest') continue;
    const near = Math.hypot(c.position[0] - sel.position[0], c.position[2] - sel.position[2]) <= WAKE_NEAR_M;
    if (c === sel || near || (c.troopId === sel.troopId && c.partyId === sel.partyId)) out.push(c);
  }
  return out;
}

/** True once one of the watched animals has left its nest act, or when none was asleep. Checked every frame: the
 * simulation runs two ticks ahead of the drawn bodies, so the drop to the default speed comes before any body moves. */
export function partyWaking(watch: readonly Chimp[]): boolean {
  if (!watch.length) return true;
  for (const c of watch) if (!c.alive || c.action !== 'nest') return true;
  return false;
}

/**
 * Who an experiment's Mind tab watches. The selected animal stays watched when the experiment reaches it (a
 * habitat-wide experiment such as Storm reaches everyone, a community one its community, a party one its radius) and
 * when nothing else claims the tab first (with the model on, a model-controlled animal must be in reach). Before, a
 * Storm started while watching an animal switched the selection and the camera to another adult of its community,
 * 700 m away in one film. Otherwise as before: the model-controlled animal nearest the stimulus, else the nearest adult
 * of the target community, else the selection.
 */
export function experimentTarget(o: {
  scope: 'party' | 'community' | 'habitat';
  selected: Chimp | undefined;
  alive: readonly Chimp[];
  at: readonly number[]; radius: number; troopId: number | undefined;
  modelOn: boolean; rosterSelected: boolean;
}): Chimp | undefined {
  const dist = (c: Chimp) => Math.hypot(c.position[0] - o.at[0], c.position[2] - o.at[2]);
  const inScope = (c: Chimp) => o.scope === 'habitat' || (o.scope === 'community' ? c.troopId === o.troopId : dist(c) <= Math.max(o.radius, 1));
  const sel = o.selected;
  if (sel && sel.alive && inScope(sel) && (!o.modelOn || o.rosterSelected || sel.controller === 'model')) return sel;
  let target = o.modelOn ? o.alive.filter(c => c.controller === 'model' && inScope(c)).sort((a, b) => dist(a) - dist(b))[0] : undefined;
  // With the 'selected' roster, selecting a chimp hands it to the model, so pick the nearest adult of the target community.
  if (!target && (o.rosterSelected || !o.modelOn)) target = o.alive.filter(c => c.troopId === o.troopId && c.stage !== 'infant' && c.stage !== 'juvenile').sort((a, b) => dist(a) - dist(b))[0];
  return target ?? sel;
}
