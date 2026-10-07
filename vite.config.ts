import { defineConfig, loadEnv, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupDecideMiddleware } from './server/decide.ts';
import { setupJevMiddleware } from './server/jev.ts';
import { execSync } from 'node:child_process';
import { hostedCopy } from './scripts/lib/hosted-copy.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['MGOGO_', 'TYPESAFE_']);
  for (const key of ['MGOGO_GHN_ROOT', 'MGOGO_DECIDE_PYTHON', 'MGOGO_DECIDE_DEVICE', 'MGOGO_JEV_ENABLED', 'MGOGO_JEV_MAX_CALLS', 'MGOGO_JEV_MODEL', 'TYPESAFE_API_KEY']) if (env[key]) process.env[key] = env[key];
  const researchNote: Plugin = {
    name: 'research-note',
    generateBundle() {
      for (const doc of ['research.md', 'simulation.md']) this.emitFile({ type: 'asset', fileName: `docs/${doc}`, source: readFileSync(resolve(process.cwd(), 'docs', doc), 'utf8') });
    },
  };
  // The production build ships the hosted copy of the decision guide (noindex; links to undeployed notes made plain
  // text). docs/decision-guide.html itself stays the generated page that scripts/decision-guide.ts --check and the tests read.
  const hostedGuide: Plugin = {
    name: 'hosted-decision-guide', apply: 'build',
    transformIndexHtml: { order: 'pre', handler(html, ctx) {
      if (!ctx.filename.replace(/\\/g, '/').endsWith('/docs/decision-guide.html')) return html;
      const git = (c: string) => { try { return execSync(`git ${c}`, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'unknown'; } };
      return hostedCopy(html, { branch: git('rev-parse --abbrev-ref HEAD'), commit: git('rev-parse --short HEAD') });
    } },
  };
  return {
    // MGOGO_NO_MODEL=1 skips the resident GLiNER worker, for extra dev servers used in visual checks.
    plugins: [...(process.env.MGOGO_NO_MODEL ? [] : [{ name: 'local-decide-bridge', configureServer: setupDecideMiddleware }]), { name: 'jev-gateway', configureServer: setupJevMiddleware }, researchNote, hostedGuide],
    build: { rollupOptions: { input: { main: resolve(process.cwd(), 'index.html'), about: resolve(process.cwd(), 'about.html'), sources: resolve(process.cwd(), 'docs/sources.html'), guide: resolve(process.cwd(), 'docs/decision-guide.html') } } },
    // Saved simulations (src/persist): SQLite WASM must not be pre-bundled (that breaks its sqlite3.wasm URL), and
    // the store runs as a module worker. opfs-sahpool needs no COOP/COEP headers.
    optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
    worker: { format: 'es' },
    server: { port: 5173, strictPort: true },
  };
});
