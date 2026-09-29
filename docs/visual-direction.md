# Forest scene

The scene is a synthetic, Kibale-inspired forest rendered as an expansive tilted RTS landscape. Coordinates, fruit, identities and activities come from `World`; the renderer never writes to the simulation. Terrain relief, tree silhouettes and the river connecting the three water resources are illustrative visual construction.

## Visual rules

- Moss and understory occupy the full canvas. Terrain and distant crowns continue beyond the 160-unit simulation bounds.
- Seven species get different crown width, depth, lobe count, trunk thickness and green tint. These are illustrative shape distinctions rather than botanical reconstructions.
- Crown masses carry silhouette and canopy shadow; 34,328 foliage points add leaf texture at seed 48. Another 380 warm dust motes make **34,708 points** in that seed. Ferns, roots, rocks and mossy fallen timber remain when the canopy layer is removed.
- Warm light comes from the upper forest; cool water and bounce light separate the darker trunks. The amber selection ring and marker remain readable through foliage.
- Desktop RTS shows a broad forest panorama. Portrait keeps a 50-unit vertical half-span, cropping the sides for pan navigation instead of shrinking the forest into a small island.
- Close view follows the focused individual from above and cuts away nearby trees and camera sightline foliage. This preserves a clear inspection area without editing habitat data.

## Animals and motion

Chimp silhouettes have broad shoulders, long jointed forearms, short hind legs, knuckles, implied fingers, brow, ears, a projecting muzzle and no tail. Bodies are enlarged for RTS readability. Life stages and male/female body scales are visual conventions rather than field measurements. Young infants are carried relative to their mothers; older dependent infants remain at the simulation position.

Four shared instanced surfaces render all animal parts. CPU joint hierarchies drive walking, feeding, drinking, grooming, climbing, seated rest, play, display and death poses. Traveling individuals keep the walking pose until their smoothed motion drops below the arrival threshold. Position interpolation and speed filtering bridge the parent's 10 Hz fixed simulation ticks and display frames; simulation positions remain authoritative. Climbing is attached to the target trunk only in the visual layer.

Reduced motion freezes dust, current drift and the rotating selection marker. It preserves activity animation, which communicates the simulation state.

## API and proof

`createScene(container, world, onSelect)` returns `update`, `setView`, `setLayer`, `focusChimp`, `panTo`, `resetCamera`, `getDiagnostics` and `dispose`. Only animal pick volumes are raycast, so terrain and foliage cannot intercept selection. Dynamic roster additions and removals reuse animal slots; the renderer's capacity of 160 exceeds the engine's current population cap of 64.

`getDiagnostics()` reports the last rendered frame's Three.js draw calls, triangles and points. These are actual renderer counters, not an FPS or hardware performance claim. Geometry and materials are shared, atmosphere stays below 60,000 points at the default layout, and per-frame pose/camera math uses persistent scratch objects. Resource ownership includes listeners, controls, observers, materials, geometries, textures and the WebGL renderer.

Focused proof: TypeScript passes with the pinned dependencies. The original desktop rendering was reviewed in the parent's browser; final close, portrait, shader and interaction acceptance belongs to the parent's current browser pass. No frame-rate or device performance acceptance is claimed here.
