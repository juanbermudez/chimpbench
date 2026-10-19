// Probe server for perf and visual measurement (docs/graphics-camera-plan.md G0): no HMR and no file watching, so
// edits by other agents cannot reload a probe page mid-run, and a private dep-optimizer cache so it never
// invalidates another server's. Never 5173. Restart it after your own edits (it does not watch).
//   pnpm exec vite --config scripts/vite.probe.config.mjs                      # live tree on 5192
//   MGOGO_PROBE_ROOT=/path/to/snapshot MGOGO_PROBE_PORT=5193 pnpm exec vite --config scripts/vite.probe.config.mjs
import { resolve } from 'node:path';
import { realpathSync } from 'node:fs';
import { searchForWorkspaceRoot } from 'vite';
const root = process.env.MGOGO_PROBE_ROOT || resolve(import.meta.dirname, '..');
const port = Number(process.env.MGOGO_PROBE_PORT || 5192);
export default {
  root,
  cacheDir: resolve(root, `node_modules/.vite-probe-${port}`),
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
  // As vite.config.ts: worktrees share node_modules through a link, and SQLite's WASM (saved simulations) resolves
  // outside the worktree through it; without this the probe server refuses it and saving is unavailable.
  server: { hmr: false, watch: null, host: '127.0.0.1', port, strictPort: true,
    fs: { allow: [searchForWorkspaceRoot(root), realpathSync(resolve(root, 'node_modules/@sqlite.org/sqlite-wasm/dist'))] } },
  logLevel: 'warn',
};
