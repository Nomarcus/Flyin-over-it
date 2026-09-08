# Version 1.0.0 — 8 September 2026

Flyin Over It is a 2D/2.5D rescue flight game. The flight model is unchanged: damped spring,
rotor response, air resistance, two-hand touch control, gyro input and a segmented winch rope.
This pass reworked the camera and the HUD.

## Camera

- The world box is sized from the screen. Landscape keeps the tuned 400-unit world height;
  taller-than-wide screens grow the box instead of letterboxing, so portrait now fills the
  flight area rather than showing a strip between black bars.
- `zoom` widens the world box with height above ground so the valley floor stays inside the
  frame while climbing. It saturates at 2x, past which the floor is allowed to leave rather
  than shrinking the craft to nothing. It pulls back fast (3.4/s) and settles in slowly (1/s)
  so level flight never breathes, and resets on mission load and checkpoint restore.
- Zoom scales the world box and the draw scale by the same factor, so the on-screen rectangle
  never moves — only how much world fits inside it.
- The craft sits below centre with roughly constant room beneath it, so a tall portrait box
  shows more sky instead of more underground rock.
- Vertical lead (`rise`) makes a climb read as motion; horizontal lead now scales with the
  viewport so wide screens see further ahead.

## HUD

- One instrument rail: hull, fuel, height above ground, souls aboard, and bearing plus range
  to the objective. Height and range were previously computed but written only to elements
  that CSS had hidden.
- Radio, tips, warnings and the target guide are visible again over the flight picture. A
  blanket `display:none` rule had disabled every one of them while `updateHUD` kept writing
  to them each tick.
- Removed the dead panels entirely: flight panel, mission panel, telemetry grid, boss panel,
  minimap (and its per-tick canvas redraw), depth readout and controls, the unused joystick,
  and the combat buttons. `drawMap` is gone.
- Narrow screens drop the aboard counter and move bearing/range to a tab under the rail.

## The valley is built end to end

Obstacles used to stop at x=5,800 of 25,200: three quarters of the route was empty terrain
between checkpoints. Every stretch now has its own problem, following the design plan's
principle that the pad at the end of a section should be earned:

- Kopparryggen: a picket of pillars, wide gaps, the gentle re-introduction.
- Floddalen: low arches. Under is quick, over costs height and time.
- Fjällstationen: a slot, something above and something below, hold the line.
- Långa passet: the signature corridor, a long ceiling with teeth under it.
- Norra dalen: open sky, tall pillars, and the wind decides when you may pass.
- Den övergivna basen: hangars and a mast, square and unforgiving gaps.
- Fyrleden: everything at once, but still fair.
- Sista anflygningen: the narrowest gate on the route, with the most to lose.

Roofs can always be flown over instead of under, so each is a route choice rather than a wall:
under is fast and tight, over costs height. Hanging obstacles are placed by the clearance they
leave, measured against the highest ground they cross, so the stated gap is the worst case.

Wind moved from a sine curve to six named zones that ramp toward the beacon, so the pattern can
be learned. Wind streaks and the readout only appear where the wind is worth reading.

In-world signage was suppressed for the whole of play by a condition in `label()`, so the route
markings, pad names, cave arrows and the beacon label had never been visible while flying. Only
the rule that a label never covers the craft remains.

## Screen budget

- The winch button used to sit in a reserved 78px rail. On a landscape phone that was a fifth
  of the screen spent on flat black. It now floats over the picture as a compact pill in the
  dead zone between the two tilt halves, with a touch target larger than the pill it draws,
  and resize() reserves only a 12px bottom margin. The flight picture grew by roughly a
  quarter in landscape.
- The world-height cap rose to 1100 so portrait can still fill the taller area without
  letterboxing.
- The route summary is hidden on phones: the bearing and range are in the instrument rail, the
  progress is in the valley strip, and the run stats are in the pause menu. Desktop keeps it.
- The valley strip moved under the instrument rail, below the bearing tab on narrow screens.

## In-world guides

- Altitude ladder along the right edge, reading the same height above ground as the rail:
  ticks every 50 m, labels every 100, a ground line and a marker that turns warm below 45 m.
- Ground proximity wash along the bottom edge as the skids close on the terrain.
- Winch guides drawn at the hook, where the pilot is already looking: rope payout in metres,
  a pickup ring around the nearest survivor or the cargo, the range to it, and a HÅLL STILLA
  prompt when the craft is inside the ring but moving too fast for the hook to take.
- Valley rail along the bottom: a tick per relay pad, the beacon at the far end, and the
  craft's position between them. Pads light up as checkpoints are banked.

## Testing

- `npm test` — 13 suites covering touch input, checkpoints, rescue and return, portrait fill,
  altitude zoom-out framing, zoom saturation, the instrument rail contents and its
  write-on-change behaviour, the valley rail (including pads lighting as checkpoints bank),
  the hull/fuel/height alert states, and the new guides under every draw state.
- Valley geometry is checked against the game's own ground(): every hanging obstacle leaves its
  stated clearance, no pillar stands inside a roof, no obstacle crowds a landing pad, and no
  stretch between checkpoints is empty. Written after that check found two roofs a pillar ran
  straight through and an arch parked 50 units from a pad — faults the flight tests could not
  see, because they reach checkpoints by teleporting.
- Handling is held to a budget: coast distance, braking distance and peak attitude.
- The test DOM stub now has a real classList, so every class the game toggles is observable
  rather than silently discarded.
- Render cost measured against the previous version with interleaved A/B runs on a software
  canvas, taking minimums: level with it at ground level (the cached vignette pays for the new
  instruments) and +2.3 ms at altitude, where four times as much world is drawn. Chromium held
  60 fps at 844x390 and 390x844, both at ground level and zoomed out.
- Verified in Chromium at 1440x900, 844x390 and 390x844: no page errors, and all four entry
  points (Lost Valley, campaign, flight school, jungle) run clean through pause and settings.
- Full-screen gradients (vignette, ground wash, ladder strip) are built once per viewport size
  instead of once per frame.
- Physical iPhone gyro and full-route human playtesting remain outstanding.

`verify-game.cjs` was removed: it asserted combat and depth behaviour the game no longer has
and crashed on run. It remains in git history. `IMPOSSIBLE_FLIGHT_PLAN.md` is a historical
design document — this file takes precedence.
