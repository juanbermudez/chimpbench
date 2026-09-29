import { defineConfig, loadEnv, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupDecideMiddleware } from './server/decide.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'MGOGO_');
  for (const key of ['MGOGO_GHN_ROOT', 'MGOGO_DECIDE_PYTHON', 'MGOGO_DECIDE_DEVICE']) if (env[key]) process.env[key] = env[key];
  const researchNote: Plugin = {
    name: 'research-note',
    generateBundle() {
      for (const doc of ['research.md', 'simulation.md']) this.emitFile({ type: 'asset', fileName: `docs/${doc}`, source: readFileSync(resolve(process.cwd(), 'docs', doc), 'utf8') });
    },
  };
  return {
    // MGOGO_NO_MODEL=1 skips the resident GLiNER worker, for extra dev servers used in visual checks.
    plugins: [...(process.env.MGOGO_NO_MODEL ? [] : [{ name: 'local-decide-bridge', configureServer: setupDecideMiddleware }]), researchNote],
    build: { rollupOptions: { input: { main: resolve(process.cwd(), 'index.html'), guide: resolve(process.cwd(), 'docs/architecture.html') } } },
    // Saved simulations (src/persist): SQLite WASM must not be pre-bundled (that breaks its sqlite3.wasm URL), and
    // the store runs as a module worker. opfs-sahpool needs no COOP/COEP headers.
    optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
    worker: { format: 'es' },
    server: { port: 5173, strictPort: true },
  };
});
