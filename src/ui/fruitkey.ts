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
  if (!layerOn || band === 'field' || viewH <= 0) return { fruit: '', memory: false };
  const fruit = !field || hf < FRUIT_MAP_IN ? '' : cellWeight(hf / viewH) > 0.5 ? 'cell' : 'tree';
  return { fruit, memory: selected };
}

/** Binds the key element (.fruitkey with .fk-fruit, .fk-fruit-text, .fk-mem and .fk-mem-name); call frame() every animation frame. */
export function createFruitKey(el: HTMLElement, viewport: HTMLElement, getScene: () => SceneAPI | null, get: () => { layerOn: boolean; field: boolean; selectedName: string | null }) {
  const fruit = el.querySelector<HTMLElement>('.fk-fruit')!, fruitText = el.querySelector<HTMLElement>('.fk-fruit-text')!;
  const mem = el.querySelector<HTMLElement>('.fk-mem')!, memName = el.querySelector<HTMLElement>('.fk-mem-name')!;
  let viewH = 0, shown = '';
  if (typeof ResizeObserver === 'function') new ResizeObserver(e => { viewH = e[0].contentRect.height; }).observe(viewport);
  return {
    frame() {
      const z = getScene()?.getZoom?.();
      const g = get();
      const s = z ? fruitKeyState(z.band, z.hf, viewH, g.layerOn, g.field, g.selectedName !== null) : { fruit: '' as const, memory: false };
      const key = `${s.fruit}|${s.memory ? g.selectedName : ''}`;
      if (key === shown) return;
      shown = key;
      fruit.hidden = s.fruit === '';
      if (s.fruit) fruitText.textContent = s.fruit === 'cell' ? `fruit in a ${FRUIT_CELL_M} m square, sized by crop` : 'tree in fruit, sized by crop';
      mem.hidden = !s.memory;
      if (s.memory) memName.textContent = g.selectedName ?? '';
      el.hidden = s.fruit === '' && !s.memory;
    },
  };
}
