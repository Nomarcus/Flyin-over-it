# Collision and damage pass

Based on Expedition Edition 59f16d0, merged onto Claude’s music revision b70f9d9. Music integration and its regression tests are preserved. This step changes contact handling and damage attachment only. Existing mission levels are retained; no new long-valley work. Flight integration, input response, camera, level generation, winch and wreck integration verified unchanged by source comparison.

- Closest-point circle/polygon contacts use real sloping pillar normals and include the solid roof lip. Up to four positional corrections handle corners. Only the strongest contact can produce damage in a simulation step; the existing hit cooldown also gates dents. Tangential velocity is preserved.
- Contact samples follow the rendered yaw and bank instead of snapping with the facing flag. The fin sample sits at the tail. The spinning rotor uses its projected ellipse. Ground checks now include nose, tail and rotor while existing skid suspension remains responsible for ordinary landings.
- Rotor impacts bend the rotor without scattering cabin dents. Tail, nose and skid marks anchor to their own skin; nearby marks on the same part deepen. Damage projection and panel deformation follow turns. Impact sparks originate at the contact. Base repairs clear damage as before.
- A detached main rotor is no longer simultaneously drawn or collided as attached during the wreck.

Validation: complete existing simulation and visual-contact suites pass, including both missions and valley regression coverage. Additional regression tests cover sloped normals, penetration recovery, roof clearance, ground clearance, turning continuity, rotor sweep, damage anchors, repair and repeated contact damage. Damage renders reviewed at both facings and mid-turn. Tests do not prove every possible collision perfect; collision samples remain a practical approximation of the mesh.
