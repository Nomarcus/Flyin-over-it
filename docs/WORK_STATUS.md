# Current state — 8 September 2026

Flyin Over It is a 2D/2.5D rescue flight game. The latest version restores the early damped flight spring, rotor response and air resistance, while preserving two-hand touch control, gyro input and the segmented winch rope.

- The Lost Valley: 26,000 world units, 11 checkpoint stations, two people at the far beacon, then return home.
- Open sky without an artificial height ceiling; camera follows altitude.
- Close camera and compact instrument HUD.
- No active combat. Legacy 3D prototype is retained in dist/flight3d.* but is not the main game.
- Current checks: npm test. verify-game.cjs is historical and includes obsolete combat/depth assertions; it is not the current regression suite.
- Tests use a simulated DOM and native Canvas. Physical iPhone gyro and full-route human playtesting remain outstanding.

IMPOSSIBLE_FLIGHT_PLAN.md is a historical design document. This current state takes precedence over its earlier combat and difficulty ideas.
