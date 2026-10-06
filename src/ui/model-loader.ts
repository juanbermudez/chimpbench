import type { ProviderStatus } from '../providers/types';

/** Startup download gate. The forest can render behind it, but ecological time stays still. */
export function createModelLoader(root: HTMLElement, options: {
  start(): Promise<void>; status(): Promise<ProviderStatus>; skip(): void; enter(): void;
}) {
  root.innerHTML = `<span class="load-name">ChimpBench</span>
    <div class="model-load"><p class="model-load-title" aria-live="polite">Preparing browser model…</p>
    <progress class="model-load-progress" max="100" aria-label="Model download"></progress>
    <p class="model-load-detail">Approximately 872 MB with GPU support, or 1.74 GB on CPU. Model files are cached on this device when browser storage permits.</p>
    <p class="model-load-error" role="alert" hidden></p>
    <div class="model-load-actions"><button class="btn" data-load="retry" hidden>Retry download</button><button class="btn" data-load="skip">Continue with rules</button></div></div>`;
  const title = root.querySelector<HTMLElement>('.model-load-title')!;
  const progress = root.querySelector<HTMLProgressElement>('progress')!;
  const error = root.querySelector<HTMLElement>('.model-load-error')!;
  const retry = root.querySelector<HTMLButtonElement>('[data-load="retry"]')!;
  const skip = root.querySelector<HTMLButtonElement>('[data-load="skip"]')!;
  let blocked = true, polling = false, generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const finish = () => { blocked = false; generation++; clearTimeout(timer); retry.blur(); skip.blur(); retry.disabled = true; skip.disabled = true; options.enter(); };
  function failed(message: string) {
    title.textContent = 'The model could not load'; error.textContent = message;
    error.hidden = false; retry.hidden = false; retry.disabled = false; progress.removeAttribute('value');
  }
  async function poll() {
    if (!blocked || polling) return;
    const current = generation; polling = true;
    try {
      const state = await options.status();
      if (!blocked || generation !== current) return;
      if (state.ready) { title.textContent = 'Model ready · opening the forest…'; progress.value = 100; finish(); return; }
      if (state.phase === 'failed' || state.phase === 'unavailable') { failed(state.error || 'Try again or continue with the simulation rules.'); return; }
      const p = state.progress;
      title.textContent = p === undefined ? 'Preparing browser model…' : p >= 100 ? 'Initializing browser model…' : `Downloading browser model · ${Math.round(p)}%`;
      if (p === undefined) progress.removeAttribute('value'); else progress.value = Math.max(0, Math.min(100, p));
    } catch (e) { if (blocked && generation === current) failed(e instanceof Error ? e.message : String(e)); }
    finally { polling = false; if (blocked && generation === current && retry.hidden) timer = setTimeout(() => { void poll(); }, 250); }
  }
  async function start() {
    generation++; clearTimeout(timer); error.hidden = true; retry.hidden = true; retry.disabled = true;
    title.textContent = 'Preparing browser model…'; progress.removeAttribute('value');
    try { await options.start(); await poll(); }
    catch (e) { if (blocked) failed(e instanceof Error ? e.message : String(e)); }
  }
  retry.addEventListener('click', () => { void start(); });
  skip.addEventListener('click', () => { if (!blocked) return; finish(); options.skip(); title.textContent = 'Opening the forest with rules…'; });
  void start();
  return { get blocked() { return blocked; } };
}
