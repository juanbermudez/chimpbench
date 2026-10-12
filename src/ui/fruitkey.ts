import type { SceneAPI } from '../types';
import { FRUIT_CELL_M, FRUIT_MAP_IN, cellWeight } from '../render/env/fruit';

// Key to the Food layer's map overlays (stage W7; docs/staging/w7-fruit.md), beside the scale bar in the strategy view:
// what a filled diamond is (a tree in fruit, or the fruit of a map square when zoomed far out) and what a hollow one is
// (a tree the selected chimp remembers). Both are stylizations drawn over the forest, and the key says "map overlay".
// Reads the zoom every frame but writes the DOM only when what it says changes.

export interface FruitKeyState {
  /** The fruit line: '' hidden, 'tree' one diamond per tree in fruit, 'cell' one per map square. */
  fruit: '' | 'tree' | 'cell';
  /** The memory line: shown while an animal is selected. */
  memory: boolean;
}
/**
 * What the key shows. band and hf: the scene's zoom; viewH: viewport height (CSS px); layerOn: the Food layer;
 * field: the real-metre map (the small map has no map marks); selected: an animal is selected. Pure.
 */
export function fruitKeyState(band: 'overview' | 'strategy' | 'field', hf: number, viewH: number, layerOn: boolean, field: boolean, selected: boolean): FruitKeyState {
  const on = keyOn(band, viewH, layerOn);
  return { fruit: on ? fruitLine(hf, viewH, field) : '', memory: on && selected };
}
// The two halves of fruitKeyState as plain values: frame() runs every animation frame and allocates nothing.
const keyOn = (band: 'overview' | 'strategy' | 'field', viewH: number, layerOn: boolean): boolean => layerOn && band !== 'field' && viewH > 0;
const fruitLine = (hf: number, viewH: number, field: boolean): FruitKeyState['fruit'] => !field || hf < FRUIT_MAP_IN ? '' : cellWeight(hf / viewH) > 0.5 ? 'cell' : 'tree';

/** Binds the key element (.fruitkey with .fk-fruit, .fk-fruit-text, .fk-mem and .fk-mem-name); call frame() every animation frame. */
export function createFruitKey(el: HTMLElement, viewport: HTMLElement, getScene: () => SceneAPI | null, get: () => { layerOn: boolean; field: boolean; selectedName: string | null }) {
  const fruit = el.querySelector<HTMLElement>('.fk-fruit')!, fruitText = el.querySelector<HTMLElement>('.fk-fruit-text')!;
  const mem = el.querySelector<HTMLElement>('.fk-mem')!, memName = el.querySelector<HTMLElement>('.fk-mem-name')!;
  let viewH = 0, shownFruit: FruitKeyState['fruit'] | null = null, shownName: string | null = null;
  if (typeof ResizeObserver === 'function') new ResizeObserver(e => { viewH = e[0].contentRect.height; }).observe(viewport);
  return {
    frame() {
      const z = getScene()?.getZoom?.();
      const g = get();
      const on = z !== undefined && keyOn(z.band, viewH, g.layerOn);
      const line = on ? fruitLine(z.hf, viewH, g.field) : '', name = on ? g.selectedName : null;
      if (line === shownFruit && name === shownName) return;
      shownFruit = line; shownName = name;
      fruit.hidden = line === '';
      if (line) fruitText.textContent = line === 'cell' ? `fruit in a ${FRUIT_CELL_M} m square, sized by crop` : 'tree in fruit, sized by crop';
      mem.hidden = name === null;
      if (name !== null) memName.textContent = name;
      el.hidden = line === '' && name === null;
    },
  };
}
