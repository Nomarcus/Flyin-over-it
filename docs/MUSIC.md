# Music — copy and paste into Suno

Eight generations. Everything is baked into each string, so nothing needs assembling: pick a
track, paste its line into **Style of Music**, generate.

## Set this up once

- **Turn the Instrumental toggle ON.** That is why none of the strings below waste characters
  saying "instrumental, no vocals".
- Paste this into **Exclude styles** and leave it there for every track:

```
vocals, lyrics, drums, build-up, drop, EDM, orchestral swell, brass, distortion, fast tempo
```

- Every string is under 200 characters, so it fits the Style box in any Suno version.

## What holds the score together

Three things, and they matter more than the individual wording: **one key** (D minor
throughout, F major only in the debrief), **one tempo family** (68–84 BPM), and **one
instrument set** that each track adds a single voice to. Do not change the key or the tempo
when you regenerate a track you are unhappy with — change the voice.

---

## 1. Main theme — generate this first

Not a file. A melody the other tracks quote, so a game you replay forty times has one shape you
come to recognise.

```
slow Nordic cinematic ambient, 76 BPM, D minor, solo felt piano stating one simple six-note theme, warm pad beneath, distant strings entering late, spacious melancholy hopeful
```

Ask for about 90 seconds. When you have one you like, **use Cover or Extend on it for `title`,
`beacon` and `debrief`** rather than generating those from scratch. That is what carries the
melody across the score instead of leaving you with three unrelated tunes.

---

## 2. `title.mp3` — the menu

```
slow Nordic cinematic ambient, 76 BPM, D minor, felt piano lead melody, warm pad, distant strings swelling once then receding, tape hiss, dawn over a cold valley, spacious hopeful
```

About 2:30. Should feel like standing still, not like starting.

---

## 3. `valley.mp3` — the flight *(you have this)*

Kept here in case you regenerate. Heard by far the longest, so it must not wear out.

```
slow Nordic cinematic ambient, 76 BPM, D minor, sustained warm pads, sparse felt piano, faint arpeggio deep in the mix, light brushed percussion, hypnotic patient, cold clear air
```

Four to five minutes. Longer is better.

---

## 4. `beacon.mp3` — the last stretch

```
slow Nordic cinematic ambient, 80 BPM, D minor, low sustained strings, single repeating piano figure, faint pulse beneath, unresolved tension, held breath, cold focused, tape hiss
```

**Unresolved is the point.** If it resolves here, the ending has nothing left to do.

---

## 5. `shaft.mp3` — down in the shafts

```
dark ambient, 70 BPM, D minor, deep drone, sparse metallic resonance, slow reversed piano, distant dripping texture, cavernous and still, heavy without menace, subterranean
```

Two minutes is plenty — nobody stays down there long.

---

## 6. `debrief.mp3` — arriving home, and the turn

```
slow ambient, 68 BPM, F major, solo felt piano playing one simple theme, room tone, one soft string line entering late, tired and fond, wry unresolved ending, tape hiss
```

The only track that does not loop — it plays under text you read once.

---

## 7. `school.mp3` — flight school

```
light ambient, 84 BPM, D minor, soft marimba, plucked synth, warm pad, small playful motif, encouraging and patient, gently comic, tape hiss
```

---

## 8. `jungle.mp3` — Emerald Passage

```
humid ambient, 74 BPM, D minor, low wooden flutes, damp percussion, wet reverb, insect texture far back, green close and alive, patient, tape hiss
```

---

## Getting them into the game

No terminal needed:

1. **github.com/Nomarcus/Flyin-over-it** → open **`dist/music`**
2. **Add file → Upload files**
3. Drop the mp3s in, named exactly `title.mp3`, `valley.mp3`, `beacon.mp3`, `shaft.mp3`,
   `debrief.mp3`, `school.mp3`, `jungle.mp3`
4. **Commit changes** to `main`

> **Watch the filename.** If your export is already called `title.mp3`, some browsers and
> upload dialogs will save it as `title.mp3.mp3`. The game asks for `music/title.mp3` exactly,
> so a doubled extension is a 404 and a silent game. `npm test` now fails on any file in
> `dist/music/` whose name is not one the game actually requests.

The deploy runs itself and the game picks them up. Add them one at a time if you like — a
missing file is skipped and falls back to another track.

Only `title` and `valley` really matter. Everything else falls back to those.

## Two things when exporting

- **MP3**, 128–192 kbps, under about 4 MB. They are downloaded over mobile data.
- **Endings that flow back into the opening.** Everything except `debrief` loops. The game dips
  the level across the seam to hide the mp3 gap, but a hard stop is still audible.
- Suno masters loud. If a track feels like it is sitting on top of the rotor and the radio
  rather than under them, pull the music slider down in **INSTÄLLNINGAR** rather than
  regenerating.

## How it behaves in game

It is a record player, not a soundtrack engine.

- `title.mp3` always plays first, so the game opens on the same music every time.
- When a track finishes, the next one starts, in this order: **title, valley, beacon, jungle,
  shaft, school, debrief**. After the last it comes back round to the first.
- **Nothing you do in the game changes the track.** Starting a mission, pausing, crashing,
  going back to the menu — the music just keeps going. That is deliberate: the earlier version
  switched on every state change, so it restarted constantly and never got anywhere.
- A file that is not there is skipped and drops out of the rotation. With only `title.mp3`
  uploaded, that one track simply repeats.
- The last second and a half of a track fades down into the change, so one ending into the next
  beginning reads as a turn rather than a cut.
- Music sits well under the game — the slider maps to a deliberately low ceiling. **LJUD** mutes
  music and effects together and releases the stream.
- Nothing plays before the first tap anywhere on the page; browsers refuse audio without a
  gesture.

The names still describe what each track is for, so if you only make three, make `title`,
`valley` and `beacon` — but any track can follow any other now, so they should all sit in the
same key and tempo family. That is what the house sound at the top of this file is for.
