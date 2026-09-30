import type { SceneAPI } from '../types';

// Map scale bar for the strategy view (orthographic: one screen pixel is the same ground distance everywhere, and the
// horizontal screen axis is level, so a horizontal bar is exact). Hidden in perspective views and blends, where
// scale changes with depth. Reads the zoom every frame but writes the DOM only when the bar's length or label changes.

/** Longest bar (CSS px); a nice length (1, 2 or 5 × 10ⁿ m) always fits in 40–100% of it. */
export const SCALE_MAX_PX = 140;

/** Nice bar length for a ground scale of metresPerPx: its metres, width (whole CSS px) and label. */
export function scaleFor(metresPerPx: number, maxPx = SCALE_MAX_PX): { metres: number; px: number; label: string } {
  const raw = metresPerPx * maxPx;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const metres = raw / p >= 5 ? 5 * p : raw / p >= 2 ? 2 * p : p;
  return { metres, px: Math.round(metres / metresPerPx), label: metres >= 1000 ? `${metres / 1000} km` : `${Number(metres.toPrecision(3))} m` };
}

/** Binds the bar element (.scalebar with .sb-rule and .sb-label) to the scene's zoom; call frame() every animation frame. */
export function createScaleBar(el: HTMLElement, viewport: HTMLElement, getScene: () => SceneAPI | null) {
  const rule = el.querySelector<HTMLElement>('.sb-rule')!, label = el.querySelector<HTMLElement>('.sb-label')!;
  // The frame height spans the canvas, which fills the viewport: its CSS height, kept by an observer (no layout reads per frame).
  let viewH = 0, lastHf = -1, shownPx = -1, shownLabel = '';
  if (typeof ResizeObserver === 'function') new ResizeObserver(e => { viewH = e[0].contentRect.height; lastHf = -1; }).observe(viewport);
  const hide = () => { if (!el.hidden) el.hidden = true; };
  return {
    frame() {
      const z = getScene()?.getZoom?.();
      if (!z || z.band === 'field' || viewH <= 0) { lastHf = -1; hide(); return; }
      // Zoom springs settle asymptotically: ignore changes under 0.05% (they cannot move the bar by a pixel).
      if (lastHf > 0 && Math.abs(z.hf - lastHf) < lastHf * 5e-4) return;
      lastHf = z.hf;
      const s = scaleFor(z.hf / viewH);
      if (s.px !== shownPx) { shownPx = s.px; rule.style.width = `${s.px}px`; }
      if (s.label !== shownLabel) { shownLabel = s.label; label.textContent = s.label; el.setAttribute('aria-label', `Map scale: ${s.label}`); }
      if (el.hidden) el.hidden = false;
    },
  };
}
