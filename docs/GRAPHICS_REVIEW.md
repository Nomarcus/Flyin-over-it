# Graphics review — Claude baseline b1717ad

Rendering-only pass. Flight, controls, camera, level data, collision geometry, damage, crash simulation and HUD are unchanged. Source comparison verified every byte outside the terrain/obstacle art block.

Found and corrected:
- Tapered pillars had irregular painted caps inside a flat collision top. Their solid outline now follows the existing trapezoid.
- Roofs collided across the full 20-unit drip band, but only scattered teeth were visible. The complete band is now stone, with inset mineral details and a readable lower edge.
- Boulder art occupied only part of rectangular colliders. These obstacles now read as cut rock blocks with fractured faces.
- Bridge art suggested open trusses and solid piers outside its collider. Closed riveted girders now fill exactly the existing obstacle footprint.
- The turf slab extended 12 units above the ground contour. The solid soil surface now starts at the sampled ground height.

Stone uses deterministic mineral planes, seams, weathered caps and restrained edge lighting. Bridges use inset metal panels, diagonal reinforcement, rivets and end markings. No render-time simulation randomness is consumed.

Validation: existing full simulation suite passes, including impacts, dents, crash completion, shaft flights and mission completion. Added native Canvas pixel checks for opaque contact edges and absence of misleading exterior walls on all four obstacle types. Actual scene and isolated obstacle renders visually inspected. These checks do not claim all possible collision edge cases are perfect; collision mathematics was deliberately preserved.
