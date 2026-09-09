# FLYIN OVER IT — visual implementation

The supplied SAR, environment, character, prop and terrain sheets are references, never full-screen gameplay images. The existing Canvas renderer remains the implementation; flight controls, force integration, rope constraints, impact geometry and mission gates remain in place.

## Components

| Component | Implementation in `dist/game.js` | Origin / behaviour |
| --- | --- | --- |
| helicopter_body | `heliBody` projected cabin cross sections and surface panels | Existing aircraft origin; depth-sorted faces and projected cockpit glazing |
| main_rotor | `heliBody` rotor geometry and RPM blur | Existing rotor shaft, y = -47; blade visibility falls with spool |
| tail_rotor | `heliBody` radial animation | Existing tail position; animated blades and radial blur |
| landing_skids | `heliBody`, `gearPoint` | Existing collision-aligned geometry and suspension compression |
| searchlight | `drawHeli`, housing in `heliBody` | Projected (26, 13, 9); layered translucent falloff |
| winch_mount | `heliBody`, `winchMount` | Projected (-6, 21, 17); shared with rope attachment |
| winch_cable / cargo_hook | `drawHeli` | Existing segmented rope nodes; orange hook follows rope angle |
| cargo_object | `drawCargo`, `drawMissionProp` | Existing cargo position, attachment and swing |
| damage_overlay / shadow | `drawDents`, `drawHeli` | Existing local impact anchors, repairs, rotor hurt and contact shadows |
| characters | `characterState`, `drawPerson` | Idle, wave/signal, waiting, pickup, injured, rescued; procedural breathing and gestures |
| props | `drawMissionProp`, `drawSceneProps` | Generator, crate, medical/supply case, fuel can, barrel, spool, beacon, container, stretcher, light, antenna |
| terrain | `drawTerrain`, `stoneFace`, `drawPillar`, `drawSpan`, `drawOverhang`, `drawBoulder`, `landingPad` | Texture clipped inside existing collision footprints |
| nature | `drawTree`, `drawJungleTree`, `drawRock`, `drawGroundDetail` | Deterministic variations, dead/snow trees, foliage, grass and rotor response |
| atmosphere | `drawSky`, `drawAtmosphere`, `drawWeather`, `drawRotorWash` | Independent layers; surface dust/snow/water effects do not apply forces |

Procedural components are retained instead of duplicating them into static sprite sheets: this preserves correct yaw, damage anchors, rope pivots, collider alignment and resolution independence. Props placed as scenery are decorative; mission cargo continues to use the existing collider and delivery checks.

## Environment system

`ENVIRONMENTS` provides Alpine Day, Alpine Sunset, Snow/Aurora, Storm Mountains, Misty Valley, Tropical Canyon, Twilight Mountains and Alpine Lake. A mission may set `environment`; otherwise its existing theme selects the preset. The environment does not change weather forces or mission geometry.

Parallax factors: sky .02, clouds .08, far mountains .18, mid mountains .30, far forest .35, mist .50, near forest .75, foreground 1. Mountain assets contain only isolated terrain; sky, clouds, forests and mist are rendered separately. Two reusable terrain panoramas are shared across palette presets.

## Raster assets and generation

- `dist/assets/backgrounds/alpine-range.webp`: isolated alpine panorama with genuine alpha; 2172 × 724 source. Created with imagegen, text-to-image mode. Prompt: one wide isolated Alpine range on transparent alpha, no sky/clouds/trees/text; detailed natural rock strata, snowy gullies, cool blue-grey shadows and warm left lighting; premium stylized 3D/painterly treatment, varied 3:1 silhouette, low end points for repetition.
- `dist/assets/backgrounds/tropical-range.webp`: isolated tropical canyon panorama. Created with imagegen in text-to-image mode with a real alpha channel. Prompt: wide transparent 3:1 ridge, warm grey eroded limestone, natural tropical canopy, varied karst pinnacles, warm upper-left light, teal recesses, no sky/clouds/water/UI or foreground props. Alpha and in-game edge quality verified before publication; subsequent experimental edits with baked backgrounds are not shipped.

The nature sprite `dist/assets/nature/pine-mature.webp` is a 512 × 768 isolated pine, generated in text-to-image mode: detailed irregular layered branches, green needles, visible bark, warm upper-left light and cool shadows, no scenery, no text, real alpha. It is reused with scale, mirroring, wind sway and snow accents.

WebP conversion preserves alpha. Original reference sheets are not shipped. No expensive per-frame image filters are used: lighting tint is cached when a biome is selected, with at most two cached 1536 × 512 surfaces. Unused former scenic images are no longer loaded by the main game. Device pixel ratio is capped at 1.5 on touch devices and 2 elsewhere. Weather counts are lower for touch devices, and panel blur is disabled on coarse-pointer devices.

## Interface and language

The title scene remains live. Menu: CONTINUE, FLIGHT SCHOOL, MISSIONS, SETTINGS. Continue remembers the last selected operation, then opens its briefing. HUD uses HULL, FUEL, ALTITUDE, CARGO, PASSENGERS, MISSION and DISTANCE. Small screens retain the existing flight/control space. English text includes mission briefings, flight school, radio, warnings, settings, results and the archived prototype.

## Verification

`npm test` runs existing touch/flight, obstacle-paint, collision and six-operation regressions. The suite checks actual winch pickups, generator delivery, bucket filling, ballistic water, rock interception, return gates, damage/repair, pause/reset and flight clearance. Continue selection is also covered.

`NODE_PATH=... node tools/render-premium.cjs` creates five representative environment renders and prints native Canvas frame timings. Those timings are diagnostic and are not an iPhone/iPad frame-rate measurement. Physical-device gyro feel and sustained 60 FPS still require device testing.
