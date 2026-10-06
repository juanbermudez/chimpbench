# ui-redesign: status (paused 5 Oct 2026)

Branch `ui-redesign` (worktree `.claude/worktrees/ui-redesign`), created from `site` (51b33ff). Paused at the coordinator's request
before any redesign code was written. Nothing is pushed.

## Done

- **Merge of `ui-minimap` (8d3a0b7)**: commit b3d9cdb. Git auto-merged it with no conflicts (`site` touched `src/ui/app.ts`
  around lines 206 and 454 and `src/style.css` `.tb-speeds` / `.model-load`; `ui-minimap` touched other regions). Both sides
  were checked in the result. `pnpm exec tsc --noEmit -p .` passes; `pnpm test`: 508 tests, 508 pass, 0 fail.
- Code reading for the redesign (notes below). No source file is changed, so nothing is half-done.
- BEFORE screenshots: **not taken yet** (they were the next step). No AFTER screenshots.

## How I read the user's requests

1. Experiments and Society each open in a **right sidebar**, in simplified content stacked to fit its width. Cards drop the
   nested boxes (typography, spacing, hairline dividers and colour chips instead of a box inside a box). Clicking a chimp
   shows its details in a **bottom panel** (centre, between the left column and the right sidebar, never a sidebar): a small
   square snapshot of the chimp, its name, its community, key details, and tabs (overview, its activity log = the field log
   filtered to that chimp, mind, family/relations), reusing the current tab content in simpler form. The panel can collapse.
2. Experiments: replace the old dock (left column) with a plain list in the right sidebar. Each experiment's description
   appears in an animated popover on hover and on keyboard focus (respecting `prefers-reduced-motion`).
3. Alpha: wherever the UI shows a crown for the alpha, use the "α" badge of the 3D chimp tag instead, and remove the crown
   icon where it becomes unused.

Open question for the next agent: what the `I` key does. Proposal: `I` shows or collapses the bottom chimp panel (today it
toggles the right inspector, which goes away). The right sidebar then holds Communities by default; `E` and `T` switch it to
Experiments or Society, and `Esc` returns it to Communities.

## Code map (what the work touches)

- Layout markup: `src/ui/app.ts` 85–118 (left column `.left` with `.p-side` field log, `aside.dock` for Experiments/Model,
  `.p-map` range map; right `aside.inspector` with `.rp-comm` and `.rp-chimp`; `.insp-peek`, `.rp-back`, `.mobile-bar`).
  Panel state: `syncPanels` 281–298; refresh steps `STEPS` 499–515 and `visibility()` 488–497 (hidden panels do no DOM work).
- 3D keep-clear insets: `queueLayout` in `src/ui/app.ts` 323–342 measures `.p-side`, `.dock`, `.inspector`, `.insp-peek` and
  `.hud`; `watchPanels` 315–317 observes them. The new bottom panel must feed `bottom` (today always 0) and the right
  sidebar must feed `right`.
- Keyboard: `src/ui/app.ts` 441–472 (E dock, T society, I inspector, M model, B sidebar, Esc chain at 447–451).
- Chimp details: `src/ui/inspector.ts` (header + tabs overview/mind/family/social/rank; `renderInto` keeps focus and
  `<details>` state); `src/ui/mind.ts`, `family-tree.ts`, `graph.ts`, `hierarchy.ts`.
- Communities: `src/ui/communities.ts` (cards), `src/ui/community-panel.ts` (detail, parties, ladders, Society links),
  `src/ui/units.ts` (member tiles, keyed and patched in place).
- Experiments: `src/ui/interventions.ts` (`EXPERIMENTS` list with `line` and `cite`; target picker; active stimuli).
- Society overlay: `src/ui/society.ts` (views kinship, dominance, bonds network, alpha history; 3 columns or one).
- Field log: `src/ui/feed.ts` (keyed list; the chimp's activity-log tab can filter `world.events` by `actors`).
- DOM updates must go through `morph` / `setAttr` / `setText` (`src/ui/morph.ts`); never innerHTML per refresh.
- Tooltip: `src/ui/tooltip.ts` (one shared, single-line, `aria-hidden` tip for `[data-tip]`); a richer popover for the
  experiment descriptions is needed (title, body, citation, scope).
- Motion tokens: `src/style.css` has only `--ease` (line 38); add duration tokens before animating.
- Crown sites to replace with the α badge: `src/ui/app.ts:554` (peek), `communities.ts:58` (card-alpha),
  `hierarchy.ts:40` (ladder rung) and `:52` (alpha card), `parts.ts:58` (rank badge), `mind.ts:67` (nearby list),
  `society.ts:61` (column head), `units.ts:61` (tile `.u-crown`), `family-tree.ts:179` (SVG `.kn-crown` path).
  Keep as icons (not alpha markers): `feed.ts:7` (hierarchy event category), `inspector.ts:26` (pant-grunt action),
  `society.ts:20` and `community-panel.ts:20` (the "Alpha history" view icon; decide whether to swap for the badge).
  CSS: `.unit svg.u-crown` (style.css:526), `.kn-crown` (680).
- α badge look to match: `src/render/creatures/labels.ts:56` (`.crl-rank.alpha`: background #e2bf79, colour #17140e,
  font 600 10px/1, padding 2px 4px, radius 4px) and `:290` (the text "α").

## Snapshot plan (researched, not implemented)

- Nothing portrait-like exists in `scene.ts`. The creature harness 'faces' mode (`src/render/creatures/harness.ts` 210–220,
  536–551) renders tiles with a per-tile camera and calls `layer.update` per camera.
- The creature layer packs instances only for animals visible to the main camera and picks the LOD from their projected size
  (`src/render/creatures.ts` 1400–1445), so rendering the main scene from a second camera would draw a coarse LOD or nothing.
- Plan: in `creatures.ts` add a one-instance portrait `InstancedMesh` that shares the LOD0 geometry attributes (copied the way
  `makeShells` does, 200–214) and `mats.material` (optionally a 3-instance shell mesh for the fur fringe), on its own layer;
  enable that layer on every scene light (as `scene.ts` does for its upload layer, around line 499). In `scene.update`, after
  `post.render`, render it into a small HalfFloat target (4× MSAA) with a perspective camera framed from `a.head`,
  `a.bx/by/bz`, `a.heading` and `a.morph.size`. Any non-XR render target gets no tone mapping and linear output, like
  `post.sceneTarget`, so no new program variants should compile (check `renderer.info.programs.length` before and after).
  Read back with `renderer.readRenderTargetPixelsAsync` (no stall), un-premultiply, tone-map on the CPU, `putImageData` into a
  canvas in the bottom panel over a CSS backdrop. Expose it as an optional scene extra (`portrait?(id, size)`) in the
  `UiDeps.getScene` type in `contracts.ts`; the preview has no scene and shows a labelled fallback (the unit chip).
- Gate: only while the bottom panel is open and not in cinematic view; refresh on selection, on an action change, at most every
  4 s; no refresh at quality 'low'. Measure the cost on the env harness by forcing a portrait every frame vs never (the
  throughput-subtraction method in the `scripts/gpu-probe.mjs` header).
- Rejected: cropping the main canvas (a chimp is ~15–25 px tall in the strategy view and sub-pixel in the overview; drawing a
  WebGL canvas into a small 2D canvas can force a full-canvas readback).

## Next steps, in order

1. Start a private dev server (below), take BEFORE screenshots at 1440×900, 1280×800, 880×900 and 390×844 of: a chimp selected,
   Experiments open, Society open (`?seed=48&persist=0`; select with `]` then `[`, open with `E` / `T`; below 1440 px open the
   inspector with `I`, on phones with the mobile bar's Inspector button).
2. Record the BEFORE `?perf=1` UI cost and DOM churn (`window.__MGOGO_UI__.mutations()`, `scripts/perf-probe.mjs`).
3. Layout skeleton: bottom panel slot, right sidebar with Communities / Experiments / Society modes; retire `aside.dock` for
   Experiments (the Model panel `M` still needs a home: keep it in the left dock or move it to the sidebar); update
   `queueLayout`, `watchPanels`, `visibility()`, `syncPanels`, Esc chain, focus hand-off. Commit.
4. Bottom chimp panel: header (snapshot slot, name, α badge, community chip, stage/sex/age, now-line) and tabs (Overview,
   Log, Mind, Family, Relations) reusing `inspector.ts` content, collapsible, `I` toggles. Commit.
5. Right sidebar content: Communities (flattened cards, unit grid), Experiments (step 6), Society stacked (dominance ladders,
   alpha history list, kinship as matriline lists, bonds as top-pairs list; the full kinship forest and network graph do not
   fit a sidebar legibly: say so in the report). Commit.
6. Experiments list with an animated popover on hover and focus (new `popover.ts` or an extended `tooltip.ts`). Commit.
7. Flattening pass in `style.css` (drop nested borders and raised backgrounds). Commit.
8. α badge everywhere (shared helper in `parts.ts`, CSS matching `.crl-rank.alpha`); remove the crown icon if unused. Commit.
9. Mobile and narrow layouts (≤ 720 px sheet, 880 px): adapt the mobile bar to the new panels. Commit.
10. Snapshot (plan above), with its measured cost. Commit.
11. README Controls, `pnpm test`, `pnpm build`, AFTER screenshots at the same sizes, `?perf=1` check, no console errors.

## Known issues and environment notes

- My first start of a plain `vite --port 5188` re-optimized the shared `node_modules/.vite/deps` (22:38; the cache key includes
  the root path, which differs per worktree). I restarted with a private cache. The private cache folder
  `/Users/juanbermudez/Desktop/MGOGO/node_modules/.vite-uiredesign-5188` (about 5 MB) is safe to delete.
- The private server used this wrapper config (it lived in the session scratchpad; recreate it anywhere outside the repo and
  run `MGOGO_NO_MODEL=1 pnpm exec vite --config <file>` from the worktree):

```ts
import base from '<worktree>/vite.config.ts';
import type { ConfigEnv, UserConfig } from 'vite';
export default (env: ConfigEnv): UserConfig => {
  const c = (typeof base === 'function' ? (base as (e: ConfigEnv) => UserConfig)(env) : base) as UserConfig;
  return { ...c, cacheDir: '<shared node_modules>/.vite-uiredesign-5188', server: { ...(c.server ?? {}), port: 5188, strictPort: true, host: '127.0.0.1' } };
};
```

- Use `?persist=0` in this worktree (saving logs a known SQLite error through the shared `node_modules` link).
