// Dev-only config for the creature harness: a private dep-optimizer cache so
// parallel agents' dev servers do not invalidate each other's optimized deps.
import { defineConfig } from 'vite';
export default defineConfig({ cacheDir: 'node_modules/.vite-creatures', server: { port: 5182, strictPort: true } });
