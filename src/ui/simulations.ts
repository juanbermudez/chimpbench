import './simulations.css';
import type { Ctx } from './app';
import type { OlderParamsView, PersistenceStatusView, PersistenceView, SimListItemView } from './contracts';
import { icon } from './icons';
import { esc, hhmm } from './format';
import { setAttr, setText } from './morph';

// Saved simulations: the menu-bar indicator (name + save state) and the Simulations dialog (new, open, save,
// rename, duplicate, delete, export, import). The store lives in src/persist and reaches the UI only through
// UiDeps.persistence, which the synthetic preview leaves out (then all of this hides itself).

const persistence = (ctx: Ctx): PersistenceView | null => ctx.deps.persistence ?? null;

export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(Date.now() - ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
export const kb = (bytes: number) => (bytes >= 1073741824 ? `${(bytes / 1073741824).toFixed(1)} GB` : bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Indicator state for the menu bar: tone (ok · busy · warn · bad · off) and a short phrase. */
export function saveIndicator(s: PersistenceStatusView, now = Date.now()): { tone: string; text: string; title: string } {
  if (s.mode === 'off') return { tone: 'off', text: 'Not saving', title: s.message || 'Saving is off for this page.' };
  if (s.mode === 'starting') return { tone: 'busy', text: 'Opening saves…', title: 'Starting the save library' };
  if (s.mode === 'locked') return { tone: 'warn', text: 'Open in another tab', title: s.message };
  if (s.mode === 'released') return { tone: 'warn', text: 'Saving in another tab', title: s.message };
  if (s.mode === 'error') return { tone: 'bad', text: 'Saving unavailable', title: s.message };
  if (s.mode === 'readonly') return { tone: 'warn', text: 'Read-only saves', title: s.message };
  if (s.saving) return { tone: 'busy', text: 'Saving…', title: 'Writing a snapshot' };
  if (s.lastError) return { tone: 'bad', text: 'Save failed', title: s.lastError };
  if (s.scratch || !s.simId) return { tone: 'warn', text: 'Not saved', title: 'This world is not saved as a simulation. Open Simulations to save it.' };
  const where = (s.mode === 'memory' ? ' (this tab only)' : '') + (s.paramsNote ? ' · older parameter set' : '');
  if (!s.lastSavedAt) return { tone: 'ok', text: `Not saved yet${where}`, title: s.autosave ? 'Autosave every minute' : 'Autosave is off' };
  return { tone: s.paramsNote ? 'warn' : 'ok', text: `Saved ${ago(now - s.lastSavedAt)}${where}`, title: `${s.paramsNote ? `${s.paramsNote} ` : ''}${s.autosave ? 'Autosave every minute, on leaving the tab and before switching.' : 'Autosave is off.'} ${s.mode === 'memory' ? s.message : ''}`.trim() };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function communitiesLine(json: string): string {
  try {
    const list = JSON.parse(json) as { name: string; alive: number; alpha: string | null }[];
    return list.map(c => `${c.name.replace(/ community$/i, '')} ${c.alive}`).join(' · ');
  } catch { return ''; }
}

export function createSimulations(dialog: HTMLDialogElement, ctx: Ctx) {
  const p = persistence(ctx);
  dialog.innerHTML = `<form method="dialog" class="dlg sims-dlg" tabindex="-1">
    <header class="dock-head"><div><h2>Simulations</h2><p class="subtle" data-k="where"></p></div><button class="icon-btn" value="close" aria-label="Close simulations">${icon('close')}</button></header>
    <div class="sims-banner" data-k="banner" role="status" hidden><span data-k="banner-text"></span><button type="button" class="btn" data-act="handoff" hidden>Use this tab</button></div>
    <section class="sims-current" aria-label="Current simulation">
      <div class="sc-main"><b class="sc-name" data-k="cur-name"></b><span class="sc-meta" data-k="cur-meta"></span></div>
      <div class="sc-actions">
        <button type="button" class="btn" data-act="save" aria-keyshortcuts="Control+S Meta+S">${icon('save')}<span data-k="save-label">Save now</span></button>
        <button type="button" class="btn" data-act="export-current">${icon('download')}Export</button>
      </div>
      <label class="sims-switch"><span class="switch"><input type="checkbox" role="switch" data-k="autosave"><span class="sw"></span></span><span>Autosave every minute, when you leave the tab and before switching simulations</span></label>
    </section>
    <section class="sims-new" aria-labelledby="sims-new-h">
      <h3 class="eyebrow" id="sims-new-h">New simulation</h3>
      <div class="sn-row">
        <input data-k="new-name" type="text" maxlength="80" placeholder="Name (optional)" aria-label="Name for the new simulation">
        <input data-k="new-seed" type="number" inputmode="numeric" min="0" aria-label="Seed">
        <button type="button" class="icon-btn" data-act="dice" aria-label="Random seed" title="Random seed">${icon('dice')}</button>
        <button type="button" class="btn" data-act="new">New simulation</button>
      </div>
      <div class="sn-profile" style="display:flex;align-items:center;gap:10px;margin-top:8px"><span class="subtle">Profile</span><span class="seg" role="radiogroup" aria-label="Scale profile"><button type="button" role="radio" data-profile="compressed">Compressed</button><button type="button" role="radio" data-profile="field">Field (real scale, experimental)</button></span></div>
      <p class="subtle">The current simulation is saved first. Same seed and settings replay the same rule-driven world.</p>
    </section>
    <section class="sims-list-sec" aria-labelledby="sims-list-h">
      <div class="sec-head"><h3 class="eyebrow" id="sims-list-h">Saved in this browser <span class="muted" data-k="count"></span></h3></div>
      <ul class="sims-list" data-k="list"></ul>
    </section>
    <footer class="sims-foot">
      <span class="subtle" data-k="storage"></span>
      <span class="sf-actions">
        <button type="button" class="btn" data-act="persist" hidden>Keep saves</button>
        <button type="button" class="btn" data-act="import">${icon('upload')}Import…</button>
        <button type="button" class="btn" data-act="export-all">${icon('download')}Export all</button>
        <input type="file" data-k="file" accept=".sqlite3,.sqlite,.db,.gz,.json,application/json,application/gzip" hidden>
      </span>
    </footer>
    <p class="honest">Saves stay in this browser profile, per site address, in an SQLite file. Export a simulation (.chimpbench.json.gz) or everything (.sqlite3) to back up or move them; older .mgogo.json.gz exports still import. While the simulation's state layout keeps changing, saves from an older layout are marked incompatible: they cannot be opened by this build, but they can still be exported.</p>
  </form>`;
  const k = <T extends HTMLElement = HTMLElement>(name: string) => dialog.querySelector<T>(`[data-k="${name}"]`)!;
  const list = k('list'), seedInput = k<HTMLInputElement>('new-seed'), nameInput = k<HTMLInputElement>('new-name'), file = k<HTMLInputElement>('file'), autosave = k<HTMLInputElement>('autosave');
  let rows: SimListItemView[] = [], renaming = '', busy = false, timer = 0;
  // Scale profile for the next new simulation (C5b): compressed 160 m map (default) or the real-metre field map.
  let profile: 'compressed' | 'field' = 'compressed';
  const syncProfile = () => dialog.querySelectorAll<HTMLElement>('[data-profile]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.profile === profile)));

  const say = (text: string, severity = 1) => ctx.notify({ text, cat: 'system', title: 'Simulations', severity });
  async function run(label: string, fn: () => Promise<unknown>) {
    if (busy) return;
    busy = true; dialog.classList.add('busy');
    try { await fn(); }
    catch (e) { say(`${label} failed: ${e instanceof Error ? e.message : String(e)}`, 2); }
    finally { busy = false; dialog.classList.remove('busy'); await refresh(); }
  }

  function syncStatus() {
    if (!p) return;
    const s = p.status(), w = ctx.world(), alive = w.chimps.reduce((n, c) => n + (c.alive ? 1 : 0), 0);
    setText(k('where'), s.mode === 'memory' ? 'Kept in this tab only' : s.mode === 'ready' || s.mode === 'readonly' ? 'Saved in this browser' : 'Saving unavailable');
    const banner = s.mode === 'locked' || s.mode === 'released' || s.mode === 'error' || s.mode === 'readonly' || s.mode === 'memory' || s.mode === 'off' ? s.message : s.lastError;
    k('banner').hidden = !banner; setText(k('banner-text'), banner);
    k('banner').dataset.tone = s.lastError && !['locked', 'released', 'memory', 'off'].includes(s.mode) ? 'bad' : 'warn';
    dialog.querySelector<HTMLElement>('[data-act="handoff"]')!.hidden = s.mode !== 'locked';
    setText(k('cur-name'), s.simId ? s.simName : 'Unsaved world');
    const saved = s.lastSavedAt ? `saved ${ago(Date.now() - s.lastSavedAt)}` : s.simId ? 'not saved yet' : 'not saved';
    setText(k('cur-meta'), `Seed ${w.seed} · ${w.size > 1000 ? 'field scale · ' : ''}day ${w.day}, ${hhmm(w.hour)} · ${alive} alive · ${s.saving ? 'saving…' : saved}${s.paramsNote ? ' · created with an older parameter set, running with the current defaults' : ''}`);
    setText(k('save-label'), s.simId ? 'Save now' : 'Save as simulation');
    const canWrite = s.mode === 'ready' || s.mode === 'memory';
    for (const act of ['save', 'new', 'import']) setAttr(dialog.querySelector(`[data-act="${act}"]`)!, 'aria-disabled', String(!canWrite));
    (dialog.querySelector('[data-act="save"]') as HTMLButtonElement).disabled = !canWrite;
    (dialog.querySelector('[data-act="import"]') as HTMLButtonElement).disabled = !canWrite;
    (dialog.querySelector('[data-act="export-current"]') as HTMLButtonElement).disabled = !s.simId;
    (dialog.querySelector('[data-act="export-all"]') as HTMLButtonElement).disabled = !(canWrite || s.mode === 'readonly');
    autosave.checked = s.autosave; autosave.disabled = !canWrite || !s.simId;
    const used = s.usage !== null ? `${kb(s.usage)} used${s.quota ? ` of ${kb(s.quota)}` : ''}` : '';
    const keep = s.persisted === true ? 'kept until you delete them' : s.persisted === false ? 'the browser may clear them if the disk fills up' : '';
    setText(k('storage'), [used, keep].filter(Boolean).join(' · '));
    dialog.querySelector<HTMLElement>('[data-act="persist"]')!.hidden = s.persisted !== false || !canWrite;
  }

  function rowHtml(r: SimListItemView): string {
    const meta = [`Seed ${r.seed}`, `day ${r.day}, ${hhmm(r.hour)}`, `${r.population} alive`, r.ageRate > 1 ? 'life course' : '', communitiesLine(r.communities)].filter(Boolean).join(' · ');
    const name = renaming === r.id
      ? `<input class="sl-rename" data-rename="${esc(r.id)}" type="text" maxlength="80" value="${esc(r.name)}" aria-label="New name for ${esc(r.name)}">`
      : `<b class="sl-name">${esc(r.name)}</b>${r.current ? '<span class="sl-badge">Open now</span>' : ''}${r.compatible ? '' : '<span class="sl-badge warn">Incompatible</span>'}`;
    return `<li class="sl-row${r.current ? ' current' : ''}${r.compatible ? '' : ' incompatible'}" data-id="${esc(r.id)}">
      <div class="sl-main"><div class="sl-title">${name}</div><span class="sl-meta">${esc(meta)}</span>
        <span class="sl-sub">${esc(`Saved ${ago(Date.now() - r.updatedAt)} · ${r.snapshots} snapshot${r.snapshots === 1 ? '' : 's'} · ${kb(r.bytes)}${r.compatible ? '' : ` · ${r.reason}`}`)}</span></div>
      <div class="sl-actions">
        <button type="button" class="btn sm" data-row="open" ${r.current || !r.compatible ? 'disabled' : ''} title="${r.compatible ? 'Open this simulation (the current one is saved first)' : esc(r.reason)}">${icon('folder')}Open</button>
        <button type="button" class="icon-btn sm" data-row="rename" aria-label="Rename ${esc(r.name)}" title="Rename">${icon('pencil')}</button>
        <button type="button" class="icon-btn sm" data-row="duplicate" aria-label="Duplicate ${esc(r.name)}" title="Duplicate (copies the newest snapshot)">${icon('copy')}</button>
        <button type="button" class="icon-btn sm" data-row="export" aria-label="Export ${esc(r.name)}" title="Export (.chimpbench.json.gz)">${icon('download')}</button>
        <button type="button" class="icon-btn sm danger" data-row="delete" aria-label="Delete ${esc(r.name)}" title="Delete">${icon('trash')}</button>
      </div></li>`;
  }

  async function refresh() {
    if (!p || !dialog.open) return;
    syncStatus();
    try { rows = await p.list(); } catch (e) { rows = []; say(`Could not list simulations: ${e instanceof Error ? e.message : String(e)}`, 2); }
    setText(k('count'), rows.length ? String(rows.length) : '');
    list.innerHTML = rows.length ? rows.map(rowHtml).join('') : `<li class="empty">${icon('folder')}<b>No saved simulations yet</b><p>${esc(p.status().message || 'Save the current world, or start a new simulation.')}</p></li>`;
    const input = list.querySelector<HTMLInputElement>('.sl-rename');
    if (input) { input.focus(); input.select(); }
  }

  async function commitRename(input: HTMLInputElement) {
    const id = input.dataset.rename!, name = input.value.trim();
    renaming = '';
    const row = rows.find(r => r.id === id);
    if (!p || !row || !name || name === row.name) { await refresh(); return; }
    await run('Rename', () => p.rename(id, name));
  }

  dialog.addEventListener('keydown', e => {
    const t = e.target as HTMLElement;
    if (t.matches('.sl-rename')) {
      if (e.key === 'Enter') { e.preventDefault(); void commitRename(t as HTMLInputElement); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); renaming = ''; void refresh(); }
    } else if (t === nameInput || t === seedInput) { if (e.key === 'Enter') { e.preventDefault(); dialog.querySelector<HTMLButtonElement>('[data-act="new"]')!.click(); } }
  });
  dialog.addEventListener('focusout', e => { const t = e.target as HTMLElement; if (t.matches('.sl-rename') && renaming) void commitRename(t as HTMLInputElement); });
  autosave.onchange = () => { p?.setAutosave(autosave.checked); syncStatus(); };
  file.onchange = () => {
    const f = file.files?.[0]; file.value = '';
    if (f && p) void run('Import', async () => say(await p.importFile(f)));
  };

  dialog.addEventListener('click', e => {
    if (!p) return;
    const el = e.target as HTMLElement;
    const act = el.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'save') void run('Save', async () => { if (await p.saveNow()) { say(`Saved “${p.status().simName}”`); void p.requestPersist(); } });
    if (act === 'dice') seedInput.value = String(Math.floor(Math.random() * 1_000_000));
    const pick = el.closest<HTMLElement>('[data-profile]')?.dataset.profile;
    if (pick === 'compressed' || pick === 'field') { profile = pick; syncProfile(); }
    if (act === 'new') {
      const n = Number(seedInput.value), seed = Number.isFinite(n) && seedInput.value !== '' ? n >>> 0 : ctx.world().seed + 1;
      const name = nameInput.value.trim() || undefined;
      nameInput.value = '';
      ctx.newWorld(seed, name, profile);
      void p.requestPersist();
      dialog.close();
    }
    if (act === 'export-current') { const s = p.status(); if (s.simId) void run('Export', async () => { const { blob, filename } = await p.exportSimulation(s.simId!); download(blob, filename); }); }
    if (act === 'export-all') void run('Export', async () => { const { blob, filename } = await p.exportLibrary(); download(blob, filename); });
    if (act === 'import') file.click();
    if (act === 'persist') void run('Keep saves', async () => say(await p.requestPersist() ? 'The browser will keep your saves until you delete them.' : 'The browser declined for now; it may still clear saves if the disk fills up. Export important runs.', 1));
    if (act === 'handoff') { p.requestHandoff(); say('Asking the other tab to hand over saving…'); }
    const rowAct = el.closest<HTMLElement>('[data-row]')?.dataset.row;
    const id = el.closest<HTMLElement>('[data-id]')?.dataset.id;
    const row = rows.find(r => r.id === id);
    if (!rowAct || !row) return;
    if (rowAct === 'open') void (async () => {
      let older: OlderParamsView | null = null;
      await run('Open', async () => { older = (await p.open(row.id)) ?? null; dialog.close(); });
      if (older) await resolveOlder(older);
    })();
    if (rowAct === 'rename') { renaming = row.id; void refresh(); }
    if (rowAct === 'duplicate') void run('Duplicate', async () => { await p.duplicate(row.id, `${row.name} (copy)`); say(`Duplicated “${row.name}”`); });
    if (rowAct === 'export') void run('Export', async () => { const { blob, filename } = await p.exportSimulation(row.id); download(blob, filename); });
    if (rowAct === 'delete' && confirm(`Delete “${row.name}” and its ${row.snapshots} snapshot${row.snapshots === 1 ? '' : 's'}? This cannot be undone.${row.current ? ' The world on screen keeps running, unsaved.' : ''}`))
      void run('Delete', async () => { await p.remove(row.id); say(`Deleted “${row.name}”`); });
  });
  dialog.addEventListener('close', () => { clearInterval(timer); renaming = ''; });

  // "Created with an older parameter set": the save opens only if the user agrees to continue it on today's
  // registry defaults (then it is labeled while it runs); otherwise export it or start a new simulation.
  const choice = document.createElement('dialog');
  choice.className = 'sims sims-choice'; choice.setAttribute('aria-labelledby', 'sims-choice-h'); choice.setAttribute('data-occluder', '');
  dialog.after(choice);
  function chooseOlderParams(o: OlderParamsView): Promise<'open' | 'new' | 'cancel'> {
    if (!p) return Promise.resolve('cancel');
    choice.innerHTML = `<form method="dialog" class="dlg">
      <header class="dock-head"><div><h2 id="sims-choice-h">Created with an older parameter set</h2>
        <p>“${esc(o.name)}” was saved with parameter set <code>${esc(o.saved || 'unknown')}</code>; this build uses <code>${esc(o.current)}</code>. Opening it continues the run with the <b>current</b> defaults (its own profile and overrides are kept), so from here on it is not the run it was, and it will be labeled as such.</p></div></header>
      <div class="sc-actions choice-actions">
        <button type="button" class="btn" data-choice="open">${icon('folder')}Open anyway (current defaults)</button>
        <button type="button" class="btn" data-choice="export">${icon('download')}Export</button>
        <button type="button" class="btn" data-choice="new">Start new (seed ${o.seed})</button>
        <button type="button" class="btn" value="cancel" data-choice="cancel">Not now</button>
      </div>
    </form>`;
    return new Promise(resolve => {
      let result: 'open' | 'new' | 'cancel' = 'cancel';
      choice.onclick = e => {
        const c = (e.target as HTMLElement).closest<HTMLElement>('[data-choice]')?.dataset.choice;
        if (c === 'export') { void run('Export', async () => { const { blob, filename } = await p.exportSimulation(o.id); download(blob, filename); }); return; }
        if (c === 'open' || c === 'new' || c === 'cancel') { result = c; choice.close(); }
      };
      choice.addEventListener('close', () => resolve(result), { once: true });
      choice.showModal();
    });
  }
  /** Runs the user's choice for a simulation that needs it (from the list, or from start-up via main.ts). */
  async function resolveOlder(o: OlderParamsView): Promise<'open' | 'new' | 'cancel'> {
    const c = await chooseOlderParams(o);
    try {
      if (c === 'open') await p!.open(o.id, true);
      if (c === 'new') ctx.newWorld(o.seed);
      if (c === 'cancel') say(`“${o.name}” was not opened. This world is not saved; Simulations has the choices again.`);
    } catch (e) { say(`Open failed: ${e instanceof Error ? e.message : String(e)}`, 2); }
    return c;
  }

  return {
    resolveOlder,
    available: !!p,
    open() {
      if (!p) return;
      seedInput.value = String(ctx.world().seed + 1);
      profile = ctx.world().size > 1000 ? 'field' : 'compressed';
      syncProfile();
      dialog.showModal();
      void refresh();
      clearInterval(timer);
      timer = window.setInterval(syncStatus, 1000);
    },
    /** Ctrl/Cmd+S and the menu: save now (streamed, no frame hitch). */
    async saveNow() {
      if (!p) return;
      const s = p.status();
      if (!(s.mode === 'ready' || s.mode === 'memory')) { say(s.message || 'Saving is unavailable in this tab.', 2); return; }
      if (await p.saveNow()) { say(`Saved “${p.status().simName}”`); void p.requestPersist(); }
    },
  };
}
