# Flyin Over It

A mobile-friendly helicopter adventure game focused on free flight, smooth touch and gyro controls, and long open rescue missions.

## Play locally

No build step is required. Open `dist/index.html` in a desktop browser, or serve the folder:

```sh
python3 -m http.server 8000 --directory dist
```

Then open http://localhost:8000. Mobile sensor permissions require a secure HTTPS origin (or a supported localhost environment).

## Controls

- Touch left/right screen half: tilt that way.
- Hold both halves: climb. Release both: descend.
- Horizontal swipe: turn the nose toward the swipe.
- WINCH: toggle lowering and raising.
- Keyboard: A/D or arrows to tilt, W/S to control lift, Q to turn, E to lower the winch (release to raise), H to stabilize.
- Gyro and sensitivity are available in settings.

## Latest version

- Original smooth 2.5D flight feel with inertia and countersteering.
- Long Valley: 26,000 world units, 11 checkpoint stations, far-beacon rescue and return flight.
- No invisible altitude ceiling; close follow camera and compact HUD.
- Clean, unobstructed mobile interface and no active combat.

## Tests

Requires Node.js and npm:

```sh
npm install
npm test
```

Tests simulate touch events, flight, checkpoints, rescue completion and high-altitude camera behavior. They do not replace physical phone testing.

## Files

- `dist/`: playable game, procedural audio and all image assets.
- `tools/verify-touch.cjs`: current regression checks.
- `tools/verify-game.cjs`: historical tests for earlier combat/depth experiments.
- `dist/flight3d.*`: archived 3D experiment, separate from the main game.
- `docs/`: current status and historical design plan.

Source snapshot: `22f3c48f06b2d4873bf858a6ba02a4d3b49e340c`.
