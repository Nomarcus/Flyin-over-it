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

## Hit boxes match the art

Measured by rendering the craft alone on a transparent canvas and reading back which pixels were
actually painted. The collision model was six circles covering the cabin and nothing else:

    painted craft with no collision behind it     75%
    tail boom reaching past its collision          31 units
    rotor and mast reaching past                   26 units
    nose reaching past                             12 units

So a tail boom or a rotor blade could pass visibly through rock and nothing happened. The hull
is now nineteen circles fitted to the measured silhouette: cabin, roof, skids, tail boom, fin,
tail rotor, and the main rotor as a line of points, because a spinning disc is exactly as solid
as it looks. Painted-but-uncovered is down to 34%, all of it interior, and the outline agrees
within 6 units everywhere. A test asserts the model still reaches the tail, the rotor tip, the
mast and the skids, so it cannot quietly shrink back.

Obstacles were rectangles drawn around art that had stopped being rectangular. Pillar shapes are
now decided once when the world is built and read by both the art and the collision, so the
taper is the same in each; and stalactites count as part of the ceiling, with the authored
clearance measured to their tips rather than to the mass above them.

Consequences, all caught by the existing tests rather than by eye:

- An accurate hull is 26 units taller at every attitude and 158 units tall at the control limit,
  so every gate was opened to admit it. The valley must never ask for an attitude it allows.
- The final span reached into the beacon rescue hover. That only worked while the tail boom had
  no collision behind it. It moved, and a test now keeps the rescue hover clear of obstacles.
- The long corridor is roomier than it was. Threading it is less tight, which is what an honest
  hull costs.

## Crashing

A crash used to cut straight to the modal: the craft was destroyed off-screen and you were told
about it. Now you watch it. On a fatal hit the game enters a wreck phase — lift dies, the main
rotor detaches and spins away keeping its rotation, panels shed, and the hull tumbles under
gravity and drag with impact torque scaled by how fast it arrived. Each ground contact bounces
with energy loss, throws dust, and adds another dent. The camera follows throughout, which is
why the camera update was lifted out of the flight path into its own function.

The modal waits until the wreck settles, or 2.9 seconds, whichever comes first. Both matter: in
a game you crash in a hundred times the sequence has to be watchable, not long. Two tuning
faults were found by watching it — micro-bounces meant the settle test never held, so every
wreck ran to the cap; and requiring ground contact to count as settled meant a wreck that came
to rest on top of an obstacle never settled at all.

Damage is real deformation now, not decals: panel vertices are pulled toward each dent as they
are projected, so the silhouette crumples where it was struck.

## Impact damage

Strikes now leave marks where they land. The collision pass already knew which point of the
airframe made contact, so that point is stored in airframe coordinates, nose-positive, and the
mark travels with the panel even after the craft turns around. Nearby hits deepen an existing
dent rather than stacking decals, and the list is capped, so a long run cannot accumulate
without bound. Deep dents show soot and bare metal, and the smoke a failing craft trails now
comes off its worst dent rather than a fixed spot on the tail.

Blade strikes are handled apart: a hit out at the rotor tip bends the disc, which visibly
wobbles and thins as it turns, rather than painting a dent in the air where the tip was. Every
mark is clamped to where there is actually hull.

A checkpoint knocks the worst of it out; base service makes the craft new again.

## Background

The far treeline was one row of identical triangles at a fixed 44-unit spacing, which reads as
a paper cut-out. It is now two bands at different depths with hashed height, width, lean and
spacing, two-tier conifer silhouettes, and clearings so the row is not a fence. The far band
barely breathes; the near one sways a little, which is as much motion as a backdrop should ask
for.

## Signage volume

Turning the in-world signage back on put every sign in the valley on screen at once. Labels now
fade out with distance from the craft, the landing instruction shows only on the pad being
approached, and the base placard only when the base is near.

## Obstacle art

Every obstacle used to be the same tinted box with a green hat, whatever it was, which is why
they read as boxes. Each type is now drawn as the thing it is, hashed off its world position so
shapes vary along the valley without flickering between frames:

- Pillars taper, carry facets and strata, catch the sunrise down one edge, and are capped with
  moss or, on the tallest spires, snow. Scree gathers at the foot.
- Spans have a deck with plank ends, a railing, an alternating truss, and piers that reach the
  valley floor. The truss is what you read the gap from as you go under it.
- Overhangs hang with weight: a dark mass above, a ragged lip with stalactites and a moss fringe
  below, and a lantern line to invite you into the passage.
- Boulders are faceted and rounded rather than rectangular.

The hazard outline was removed with them. Stroking a rectangle around every obstacle read as a
selection box once the obstacles stopped being rectangles; the warm glow at the nearest point
and the rotor callout already say what it said.

## The ending turns

Reaching Eagle Base opens the debrief, and the debrief has a second beat. The distress beacon
was a scheduled test transmission from the weather station, and the two people winched off the
mountain were technicians on a service visit who had a car. They came along because you looked
like you had made an effort. Nobody was ever in danger, and Ann-Sofie would like to know if you
could fly back, because they left the toolbox.

Crash lines went from four to fifteen and checkpoints now hand out one of seven grudging
compliments. A test asserts the ending is reachable and that the turn actually shows: an ending
no one sees is not an ending.

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

The first arch in the game was also its tightest passage, 112 units against a craft 77 tall. It
is now 175, and the three snuggest gates went to 155, so the curve starts gentle and tightens.

Roofs can always be flown over instead of under, so each is a route choice rather than a wall:
under is fast and tight, over costs height. Hanging obstacles are placed by the clearance they
leave, measured against the highest ground they cross, so the stated gap is the worst case.

Wind moved from a sine curve to six named zones that ramp toward the beacon, so the pattern can
be learned. Wind streaks and the readout only appear where the wind is worth reading.

In-world signage was suppressed for the whole of play by a condition in `label()`, so the route
markings, pad names, cave arrows and the beacon label had never been visible while flying. Only
the rule that a label never covers the craft remains.

## Taking off again

Two faults made the craft feel stuck on the ground, both found from a player report that a
slope was hard to leave.

The first was the real one. Ground contact zeroed the vertical velocity on every tick the craft
touched, which threw away the climb the rotor had just built: it could only ever rise one tick's
acceleration at a time, about 0.015 units. On a slope it slides while doing that, and the ground
falls away about 0.015 units per tick as it slides — slightly faster than it rises. Contact
never broke, and full collective went nowhere while the craft slid quietly downhill. Sweeping
498 resting places across the valley, 151 could not be left at all and another 41 took over 1.6
seconds. Contact now cancels downward motion but keeps the climb, and the sweep reports none of
either.

The second was narrower: the craft was laid flat along whatever slope it sat on, so on ground
steeper than 53.5 degrees, cos(angle) of full collective (530) fell below gravity (315) and no
amount of power could lift it. The gear now takes up at most 0.42 rad, resting the craft on its
downhill skid past that.

Both are covered by a suite that samples slopes of every character plus the steepest ground in
the valley. It fails on the old code at the first 6.7-degree slope it tries.

## Attitude and the lift trade

The nose reaches much further over: authority .60 -> .84, hard limit .72 -> .96. Because lift is
cos(angle) of rotor thrust, a deep nose buys speed out of height. Measured at hover power:

    peak attitude        .596 -> .835   +40%
    sink at full tilt      45 -> 87     +93%
    speed at full tilt    195 -> 267    +37%
    braking distance      133 -> 122     -8%

So the nose is now something to hold rather than something to hold down: put it over for speed
and the floor comes up to meet you unless you add collective. Braking improved as a side effect,
since the same deeper attitude bites harder against the direction of travel.

A tilted craft is also taller, because the rotor disc swings into the vertical: 77 units level,
101 at 20 degrees, 132 at the limit. The tightest gate in the valley is 155, so the craft always
fits, but the margin falls from 78 units to 23. Levelling out to thread a gap is now a real part
of flying it. A test asserts every gate admits the craft at full tilt.

## Screen budget

- The winch button used to sit in a reserved 78px rail. On a landscape phone that was a fifth
  of the screen spent on flat black. It now floats over the picture as a compact pill in the
  dead zone between the two tilt halves, with a touch target larger than the pill it draws,
  and resize() reserves only a 12px bottom margin. The flight picture grew by roughly a
  quarter in landscape.
- The world-height cap rose to 1100 so portrait can still fill the taller area without
  letterboxing.
- The instrument rail floats over the picture on phones behind a scrim instead of reserving a
  54px band, which had cost 14% of a landscape iPhone. With the winch pill that takes the black
  chrome from a third of the screen to almost nothing.
- Signage is held at a constant size on screen. Sizes are authored in world units, so a phone's
  wider world box shrank every sign and zooming out shrank them further.
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

- `npm test` — 18 suites covering touch input, checkpoints, rescue and return, portrait fill,
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
