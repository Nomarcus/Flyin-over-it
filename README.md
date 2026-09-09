# Flyin Over It

A mobile-friendly helicopter adventure game focused on free flight, smooth touch and gyro controls, and six varied rescue, cargo and firefighting missions.

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
- WINCH / BUCKET: toggle lowering and raising.
- DROP WATER / Space: toggle water release during firefighting missions.
- Keyboard: A/D or arrows to tilt, W/S to control lift, Q to turn, E to lower the winch (release to raise), H to stabilize.
- Gyro and sensitivity are available in settings.

## Latest version

- Original smooth 2.5D flight feel with inertia and countersteering.
- Six selectable missions, increasing from 2,400 to 8,000 world units.
- Physical water bucket: scoop from lakes, carry the extra weight, aim ballistic drops at fires.
- Mission chains: deliver power before rescue, or extinguish fires before evacuation.
- Long Valley is temporarily archived and absent from player navigation.
- No invisible altitude ceiling. The camera pulls back as you climb so the valley floor stays
  in frame, and leads both your climb and your speed.
- Fills the screen in portrait as well as landscape.
- One instrument rail: hull, fuel, height above ground, souls aboard, bearing and range.
- Radio calls, tips and warnings appear over the flight picture.
- Clean, unobstructed mobile interface and no active combat.

## Tests

Requires Node.js and npm:

```sh
npm install
npm test
```

Four verification scripts cover touch, flight, collision geometry, damage, rendering, and all six
mission completions. Water checks cover scooping, suspended mass, ballistic hits, misses, rock
interception, restart and pause. They do not replace physical phone testing.

## Files

- `dist/`: playable game, procedural audio and all image assets.
- `tools/verify-touch.cjs`: the regression suite (`npm test`).
- `dist/flight3d.*`: archived 3D experiment, separate from the main game.
- `docs/`: current status and historical design plan.

Source snapshot: `22f3c48f06b2d4873bf858a6ba02a4d3b49e340c`.

