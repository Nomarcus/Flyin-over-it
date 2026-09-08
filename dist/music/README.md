# Music

Drop MP3 files here with exactly these names. The game picks them up on its own — no code
change needed. A file that is missing or fails to load is skipped, and the game falls back to
another track or plays nothing, so you can add them one at a time.

| File | When it plays |
|---|---|
| `title.mp3` | Menu, settings, and the debrief if `debrief.mp3` is absent |
| `valley.mp3` | Flying The Lost Valley — the main theme, heard the longest |
| `beacon.mp3` | The last stretch, from 20 000 units to the beacon |
| `shaft.mp3` | Down inside a shaft, below the rim |
| `debrief.mp3` | Arriving home and the epilogue |
| `school.mp3` | Flight school |
| `jungle.mp3` | The Emerald Passage mission |

Only `title.mp3` and `valley.mp3` really matter. Everything else falls back to those.

## Format

- **MP3**, 128–192 kbps. Plays everywhere, streams rather than loading whole.
- **Keep them under about 4 MB each.** They are downloaded over mobile data.
- Tracks loop automatically. MP3 leaves a small gap at the seam, so the game dips the volume
  across it — write endings that can flow back into the opening rather than hard stops.
- Mixed a touch quiet is better than loud: the rotor and the radio sit on top of it.

## Trying one out

Put the file in place, then `npm test` and open the game. The music volume slider is in
**INSTÄLLNINGAR**, and the LJUD button mutes music and effects together.

## Before the files are added

Until an mp3 is in place the browser console logs a 404 for it. That is expected and harmless:
each track is attempted once per session, then remembered as missing and never requested again.
The game keeps running and simply plays nothing. The moment a file appears, it is used.
