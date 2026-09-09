# Six operations — September 2026

The long valley is archived; the player menu now offers exactly six operations. Flight school remains. Existing control coefficients, turning, camera and hull collisions are preserved.

| # | Mission | Length (world units) | Task and obstacle intent |
|---|---|---:|---|
| 1 | Första larmet | 2400 | Two rescues; one ridge introduces a high route and early braking. |
| 2 | Skogsbranden | 3400 | Scoop at the lake; two finite fires teach suspended mass and drop lead. |
| 3 | Fyren utan ström | 4400 | Deliver generator before two rescues; suspended rock crossing and service pad. |
| 4 | Smaragdspasset | 5400 | Three researchers, one in a 275-unit-clearance cave; open route above. |
| 5 | Glödlinjen | 6600 | Three fires, two refill lakes, then three evacuations; bucket changes to rescue hook. |
| 6 | Sista ljuset | 8000 | Winter cargo delivery, four rescues, two service pads, optional low rock passages. |

All are selectable. No failure timer. Stars reward completion, target time and clean landings/healthy hull. Base and field pads repair and refuel. The final operation returns to mission selection.

## Water and controls

Same two-hand flight controls. E / BUCKET lowers and raises. A bucket held in a lake fills in two seconds at low speed. Space / DROP WATER toggles release, automatically stopping when empty. Empty bucket mass is .035; water adds up to .22 relative mass, applied only to suspended load. The existing segmented rope carries the bucket, with floor clearance matching its bottom. Drops inherit hook velocity, gravity and wind; swept collision prevents water passing through rock. Each drop consumes real stored water; misses require another lake visit. Heat and immersion use existing hull damage/cooldowns.

After all fires are extinguished, the bucket is removed and the ordinary rescue winch returns. Sheltered residents can only be picked up after their power/fire gate is satisfied. Fire debrief includes water accuracy.

## Verification

`npm test` retains earlier flight/touch/collision/graphics coverage and adds `verify-operations.cjs`: six actual winch/cargo/water completions with return, finite water and misses, rock interception, resets, pause, load mass, and a cave rescue with full flight/collision simulation. The harness positions the craft between task locations; it does not certify human flight times or physical mobile feel. The archived valley still runs in regression tests but has no menu entry.
