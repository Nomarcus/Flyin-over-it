# Vegetation review

Based on Claude commit e02a55d5ffcf3a7255c01db28ef600fb0006816b. Preserve its audio, music, controls, collision geometry and mission definitions.

- Remove the random 10% legacy polygon pine selection and the low-poly jungle canopy.
- Use detailed reusable tree art in foreground and both distant forest layers.
- Cache day/night/snow color treatments at 256 × 384; no per-frame image filters.
- Reserve pause-button clearance in the mission HUD.
- Derive summit labels from mission region and terrain elevation.

New asset: `dist/assets/nature/rainforest-tree.png`. Built-in image generation; original transparent RGBA retained. Runtime source rectangle removes transparent outer padding for correct root placement.

Generation prompt:

Create one production-ready isolated tropical broadleaf rainforest tree sprite for a premium 2.5D side-scrolling rescue helicopter game. Full tree from roots to crown, orthographic side elevation, single straight sturdy slightly irregular trunk branching into asymmetric naturally clustered foliage. Detailed olive and deep natural green small leaves with visible gaps and layered dappled light, textured gray brown bark, restrained soft warm daylight from upper left, naturalistic handcrafted game render matching realistic mountain backgrounds. Clean readable silhouette at 150 pixels high. Genuinely transparent RGBA background, no scenery, no floor plane, no text, no sheet, no border, no shadows beyond small roots. Center tree with transparent padding, all leaves and roots fully inside frame. Not low-poly, no geometric umbrella canopy, no cartoon blobs, no neon, no thick outlines. Output asset for implementation into game, provide local output path.

Verification: native Canvas render inspection for tropical, snow and summit scenes; regression coverage for textured trees and the existing gameplay suite. This is not a claim of a full manual playthrough.

Finale review: THE LAST CLIMB. The original station deck blocked the entire shaft, making ascent from below impossible. Its collider and visible deck now share a 280-unit width, leaving 250-unit approaches on both sides. Checkpoint deck artwork now matches its 260-unit collider. Station completion requires contact with the station deck. Station supports, edge lights, crew and architecture fit its landing deck. Regression asserts both station approaches clear the 205-unit helicopter hull. Existing simulated flight covers the first four gates, with separate checkpoint, weather, collision and completion checks; it is not a full manual playthrough.

Finale weather now exclusively uses altitude bands, removing the generic storm rain that previously continued above the clouds. LIGHT replaces WINCH in the mobile action slot and is hidden again outside the finale.
