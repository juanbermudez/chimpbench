// Range map view math (src/ui/minimap.ts): one transform places every mark, inverts a click and lines up the cached
// habitat layers. Pure and allocation-free (results go into a caller's object), so the map can redraw every frame
// while it zooms or pans.

/** A range map view: magnification (1 = the whole map) and the world point (x, z) at the map's centre. */
export interface MapView { zoom: number; x: number; z: number }

export const MAP_ZOOM_MAX = 8;
const NOTCH = 1.25;   // zoom per wheel notch

/** World coordinate → map pixel along an axis `px` pixels long. At 1× (mid 0) this is exactly (v / size + 0.5) · px. */
export const toMap = (v: number, mid: number, zoom: number, size: number, px: number) => ((v - mid) / size * zoom + 0.5) * px;

/** Fraction across the map (0..1) → world coordinate: the click inverse of toMap. */
export const fromMap = (f: number, mid: number, zoom: number, size: number) => mid + (f - 0.5) * size / zoom;

/**
 * The view clamped to 1–8× and kept inside the world: the map never shows beyond the world edge. A hair above 1×
 * snaps to 1×, which is always the whole map centred on (0, 0), so the 1× map draws exactly as it did before zoom.
 */
export function clampView(size: number, zoom: number, x: number, z: number, out: MapView): MapView {
  zoom = Math.min(MAP_ZOOM_MAX, Math.max(1, zoom));
  if (zoom < 1.001) { out.zoom = 1; out.x = 0; out.z = 0; return out; }
  const half = size / 2 - size / (2 * zoom);   // farthest the centre may sit from the map centre at this zoom
  out.zoom = zoom; out.x = Math.min(half, Math.max(-half, x)); out.z = Math.min(half, Math.max(-half, z));
  return out;
}

/** The view after zooming to `zoom` about the map fraction (u, v): the world point there stays put (unless clamped). */
export function zoomAbout(size: number, from: MapView, zoom: number, u: number, v: number, out: MapView): MapView {
  const z = Math.min(MAP_ZOOM_MAX, Math.max(1, zoom));
  const ax = fromMap(u, from.x, from.zoom, size), az = fromMap(v, from.z, from.zoom, size);
  return clampView(size, z, ax - (u - 0.5) * size / z, az - (v - 0.5) * size / z, out);
}

/**
 * Pixel offset that places a layer drawn for a view centred at `fromMid` into the view centred at `toMid`, once
 * scaled by s = to.zoom / from.zoom (canvas setTransform(s, 0, 0, s, offsetX, offsetZ)).
 */
export const layerOffset = (s: number, fromMid: number, toMid: number, toZoom: number, size: number, px: number) =>
  px * (0.5 * (1 - s) + (fromMid - toMid) * toZoom / size);

/**
 * Zoom factor of one wheel event: 1.25 per notch, a notch being 100 px, 3 lines or a tenth of a page (as the 3D
 * camera counts them), at most 3 notches per event. A trackpad pinch arrives as ctrl+wheel with small deltas and
 * follows the browser's own pinch-zoom rate, capped at one notch per event (a ctrl+mouse-wheel notch).
 */
export function wheelFactor(deltaY: number, deltaMode: number, ctrlKey: boolean): number {
  if (ctrlKey) return Math.min(NOTCH, Math.max(1 / NOTCH, Math.exp(-deltaY * 0.01)));
  const unit = deltaMode === 1 ? 3 : deltaMode === 2 ? 0.1 : 100;
  return NOTCH ** Math.min(3, Math.max(-3, -deltaY / unit));
}
