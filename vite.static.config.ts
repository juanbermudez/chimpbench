// Static build of the app alone (no model server, no saves, no sound files) for hosting as a published page:
// VITE_STATIC=1 MGOGO_NO_MODEL=1 pnpm exec vite build --config vite.static.config.ts --outDir <dir>
import { resolve } from 'node:path';
import { mergeConfig, type ConfigEnv } from 'vite';
import base from './vite.config.ts';
export default (env: ConfigEnv) => mergeConfig((base as (e: ConfigEnv) => object)(env), {
  base: './',
  publicDir: false,
  build: { emptyOutDir: true, rollupOptions: { input: { main: resolve(process.cwd(), 'index.html') } } },
});
