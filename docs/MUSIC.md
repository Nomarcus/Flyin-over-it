# Music briefs

Seven tracks plus a main theme. `valley` is the reference — it came out right, so everything
else is built from the same parts so the score sounds like one hand wrote it.

The whole brief in one line: **music you can lose to forty times without resenting it.**
Nothing that demands attention, nothing with a hook that wears out, nothing that celebrates.

---

## The house sound

Paste this into every prompt, then add the track's own line. Keeping it word-for-word is what
makes seven separate generations sound like one score.

```
instrumental, slow Nordic cinematic ambient, 76 BPM, D minor, felt piano and sustained warm
pads, distant strings, soft tape hiss, light brushed percussion, patient and unhurried, cold
clear mountain air, no vocals, no build, no drop, loops seamlessly
```

Three things hold it together, and all three matter more than the individual prompts:

- **Same key.** D minor throughout, except the debrief which resolves into F major.
- **Same tempo family.** 70–84 BPM. Nothing outside that.
- **Same instrument set.** Felt piano, warm pad, distant strings. Each track adds *one* voice
  of its own and leaves the rest alone.

---

## The main theme

Not a file of its own. It is a **melody** — five or six notes, slow, unhurried — that you write
once and let the other tracks quote. `title` states it plainly, `beacon` hints at it under
tension, `debrief` plays it one last time and lets it fall apart.

This is the single highest-value thing you can do for the score. A game you replay forty times
needs one shape you come to recognise, not seven pieces of wallpaper.

Generate it as its own short piece first, then feed it to the others:

```
instrumental, slow Nordic cinematic ambient, 76 BPM, D minor, solo felt piano stating one
simple memorable six-note theme, warm pad underneath, distant strings entering late, spacious
and melancholy but hopeful, no percussion, no vocals, no build
```

Ask for about 90 seconds. When you have one you like, use Suno's **Cover** or **Extend** on it
for `title`, `beacon` and `debrief` rather than generating those from scratch — that is what
carries the melody across the score instead of three unrelated tunes.

---

## `title.mp3` — the menu

The one track allowed to be beautiful on purpose. It plays while someone reads *"Varje meter
räknas"* and decides whether to go again.

```
[house sound] + full statement of the main theme, felt piano leading, strings swelling gently
once and receding, dawn over a cold valley, hopeful, spacious
```

About 2:30. Should feel like standing still, not like starting.

---

## `valley.mp3` — the flight *(done)*

The reference track. Heard by far the longest — forty minutes of crashing happens over this, so
it must not wear out and must not comment on how you are doing.

Keep whatever produced Valley 3. If you regenerate it, the shape that worked was: sustained
pads, sparse piano, an arpeggio well back in the mix, almost hypnotic, no melody repeating
often enough to notice.

Longer is better. Four to five minutes.

---

## `beacon.mp3` — the last stretch

From 20 000 units in. Long way flown, close enough now to lose something real. More tension —
but no triumph, because the twist has not landed yet.

```
[house sound] + low sustained strings, a single repeating piano figure, faint pulse underneath,
the main theme implied but never resolved, held breath, focused, cold
```

The instruction that matters: **implied but never resolved.** If it resolves, the ending has
nothing left to do.

---

## `shaft.mp3` — down in the shafts

Below the rim, walls both sides, sky a long way up. The only track allowed to feel enclosed.

```
[house sound] but darker and slower, 70 BPM, deep drone replacing the pad, sparse metallic
resonances, slow reversed piano, distant dripping texture, cavernous and still, heavy without
menace, no melody
```

Two minutes is plenty — nobody stays down there long.

---

## `debrief.mp3` — arriving home, and the turn

Plays while the player learns the beacon was a scheduled test transmission and the two
survivors had a car. It should start like an ending and quietly fail to be one.

```
[house sound] resolving to F major, 68 BPM, solo felt piano playing the main theme one last
time, room tone, one soft string line entering late, tired and fond rather than triumphant,
ending unresolved and slightly wry, no percussion
```

This one does not need to loop — it plays under text you read once.

---

## `school.mp3` — flight school

Lighter and a little sillier. Someone is learning to hover and failing at it.

```
[house sound] but warmer and lighter, 84 BPM, soft marimba or plucked synth carrying a small
playful motif, encouraging and patient, gently comic, nothing tense
```

---

## `jungle.mp3` — Emerald Passage

The one place that is not cold. Humid, green, close.

```
[house sound] but humid instead of alpine, 74 BPM, low flutes, damp percussion, wet reverb,
insect texture far back, green and close and alive, denser than the alpine tracks but just as
patient
```

---

## Getting them in

1. Export from Suno as **MP3**, 128–192 kbps, under about 4 MB.
2. Name the file exactly as above and put it in `dist/music/`.
3. Commit and push to `main`. The deploy picks it up automatically.

No code change needed. The game loads what is there and skips what is not, so add them one at a
time and hear each one.

## Two things to watch when generating

- **Write endings that flow back into the opening.** Every track except `debrief` loops. The
  game dips the level across the seam to hide the mp3 gap, but a hard stop is still audible.
- **Mix it a touch quiet.** The rotor drone and the radio voice sit on top of the music, and
  Suno tends to master loud.

## How it behaves in game

- Tracks crossfade over about a second when the game changes what it wants.
- **LJUD** mutes music and effects together and releases the stream.
- **INSTÄLLNINGAR** has a music volume slider, audible while you drag it.
- Nothing plays before the first tap — browsers refuse audio without a gesture.
