# Music briefs

Seven tracks. Two of them matter; the rest fall back to those, so you can add them one at a
time and hear the result each time.

The game is a long, patient flight that you keep failing and restarting. That is the whole
brief in one line: **music you can lose to forty times without resenting it.** Nothing that
demands attention, nothing with a hook that wears out, nothing that celebrates.

Shared palette, so the tracks sound like one score:

- Slow tempo, 70–90 BPM. The helicopter is heavy; the music should be too.
- Acoustic and airy: piano, felt strings, soft synth pads, light percussion or none.
- Nordic and cold rather than orchestral and heroic. Restraint over swell.
- Mixed a touch quiet. The rotor drone and the radio voice sit on top of it.
- No vocals with words. Wordless voice as texture is fine.
- Write endings that can flow back into the opening. The track loops, and a hard stop is
  audible even with the dip the game puts across the seam.

---

## `title.mp3` — the menu

The only track that is allowed to be beautiful on purpose. This is the one playing while
someone reads "Varje meter räknas" and decides whether to try again.

> Slow cinematic Nordic ambient, 72 BPM. Felt piano over a low warm synth pad, distant strings,
> soft tape hiss. Melancholy but hopeful, wide open, unhurried. Dawn over a cold mountain
> valley. No drums, no vocals, no build to a climax. Loops seamlessly.

Two and a half minutes is plenty.

---

## `valley.mp3` — the flight

The track heard the longest, by far. Someone will have this on for forty minutes while
crashing repeatedly. It must not wear out, and it must not comment on how you are doing.

> Minimal ambient flight score, 76 BPM. Sustained warm pads, sparse piano notes, gentle
> arpeggio far back in the mix, very light brushed percussion. Patient and steady, almost
> hypnotic. Cold clear air, long distance, no drama. No build, no drop, no melody that repeats
> often enough to notice. Loops seamlessly.

Longer is better here. Four to five minutes.

---

## `beacon.mp3` — the last stretch

From 20 000 units in. The player has been flying for a long time and is close enough to lose
something. Slightly more tension, but still no triumph: the twist has not landed yet.

> Ambient score with quiet tension, 80 BPM. Low sustained strings, a single repeating piano
> figure, faint pulse underneath. Cold, focused, held breath. Something important is near but
> not certain. No percussion swell, no resolution. Loops seamlessly.

---

## `shaft.mp3` — down in the shafts

Below the rim, walls on both sides, sky a long way up. This is the only track allowed to feel
enclosed.

> Dark ambient, 70 BPM. Deep drone, sparse metallic resonances, slow reversed piano, distant
> dripping texture. Enclosed, cavernous, still. Heavy without menace. No melody, no drums.
> Loops seamlessly.

Two minutes is enough — nobody stays down there long.

---

## `debrief.mp3` — arriving home, and the turn

Plays while the player is told that the beacon was a scheduled test transmission and the two
survivors had a car. It should start like an ending and quietly fail to be one.

> Warm quiet outro, 68 BPM. Solo felt piano, room tone, one soft string line entering late.
> Tired and fond rather than triumphant. Ends unresolved, slightly wry. No percussion.

This one does not need to loop well — it plays under a dialogue you read once.

---

## `school.mp3` — flight school

Lighter and a little sillier than the rest. Someone is learning to hover and failing.

> Light ambient with a gentle pulse, 84 BPM. Soft marimba or plucked synth, warm pad, small
> playful motif. Encouraging, patient, slightly comic. Nothing tense. Loops seamlessly.

---

## `jungle.mp3` — Emerald Passage

The one place that is not cold. Humid, green, close.

> Humid ambient, 74 BPM. Low flutes, damp percussion, wet reverb, insect texture far back.
> Green, close, alive. Warmer and denser than the alpine tracks but just as patient. Loops
> seamlessly.

---

## Getting them in

1. Export from Suno as **MP3**, 128–192 kbps, under about 4 MB.
2. Name the file exactly as above and put it in `dist/music/`.
3. Commit and push to `main`. The deploy picks it up automatically.

No code change is needed. The game loads what is there and skips what is not.

## How it behaves

- Tracks crossfade over about a second when the game changes what it wants.
- The level dips across the loop seam, because an mp3 loop leaves a small gap.
- The **LJUD** button mutes music and effects together and releases the audio stream.
- **INSTÄLLNINGAR** has a music volume slider that is audible while you drag it.
- Nothing plays until the first tap. Browsers refuse audio before a gesture, so the title theme
  starts when the player touches the menu.
