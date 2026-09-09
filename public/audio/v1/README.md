# App-hosted puja audio — manifest v1

The player (`components/platform/audio-player.tsx`), the manifest
(`lib/audio/manifest.ts`), the generator (`scripts/generate-audio.mjs`) and the
build-time validator (`scripts/validate-audio.mjs`) are complete.

**No MP3 files are bundled.** Every asset is `status: "PLANNED"`, so the player
shows its honest "being finalised" state and the device-voice control stays
only as a clearly-labelled temporary fallback for *plain instructions* — never
for a mantra. `scripts/validate-audio.mjs` (run from `npm run build`) fails the
build if any `.mp3` appears here whose manifest asset is still `PLANNED`, if a
`GENERATED` asset's file is missing/empty/not-an-MP3, or if the sidecars don't
match the manifest text.

## What the manifest declares

| Kind | File (served from `/audio/v1/…`) | When it exists |
| --- | --- | --- |
| Plain instruction, English | `<stepId>.en.plain.mp3` | every step |
| Plain instruction, Telugu | `<stepId>.te.plain.mp3` | **only** when Telugu source text exists for that step (`stepGuidanceTe(id).whatToDo`) |
| Mantra candidate, Telugu | `<stepId>.mantra.te.mp3` | every mantra step |

Each asset carries the **exact narration `text`** and a stable `textRef`:

- EN plain → `RitualStep.what + " " + RitualStep.how`
- TE plain → `stepGuidanceTe(id).whatToDo` (Telugu — **never** derived from English)
- Mantra → `RitualStep.mantraTeluguScript`, byte-for-byte (transcription unchanged)

Do **not** re-word, complete or "correct" any mantra text for the recording.

## Generating the files — BLOCKED without credentials + explicit approval

`.claude/rules/security.md`: puja / sacred-source text must not be sent to a
third-party service without the owner's explicit approval. This environment has
no TTS credential and `scripts/generate-audio.mjs` makes **no** network call
without both `SPEECH_KEY` + `SPEECH_REGION` **and** the `--i-have-approval`
flag. Mantra audio additionally requires `--confirm-mantra`.

```
# see exactly what would be sent (no call, nothing written):
node scripts/generate-audio.mjs --kind en-plain
node scripts/generate-audio.mjs --kind te-plain
node scripts/generate-audio.mjs --kind te-mantra --confirm-mantra

# owner, with an Azure AI Speech resource, actually generate:
SPEECH_KEY=xxxxxxxx SPEECH_REGION=centralindia \
  node scripts/generate-audio.mjs --kind te-plain --i-have-approval
```

### Azure AI Speech (the implemented adapter)

- Voices: `te-IN-MohanNeural` / `te-IN-ShrutiNeural` (Telugu),
  `en-IN-PrabhatNeural` / `en-IN-NeerjaNeural` (Indian English).
- Endpoint: `https://<region>.tts.speech.microsoft.com/cognitiveservices/v1`
  with SSML and `X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3`.
- The generator writes, next to each `.mp3`: `<file>.txt` (the exact text),
  `<file>.sha256`, and `<file>.meta.json` (provider, voice, kind, status,
  `textSha256`, `generatedAt`).

Other providers (Google Cloud TTS, self-hosted AI4Bharat Indic-TTS) can be
added as adapters in `PROVIDERS`; only `azure` is implemented.

## After generation

1. Set the delivered assets' `status` in `lib/audio/manifest.ts`
   (`GENERATED` for plain, `REVIEW_CANDIDATE` for mantra).
2. `node scripts/validate-audio.mjs` — must pass.
3. `npm test`, then a browser check that Play / Pause / Replay / Stop work, that
   mantra audio is labelled a review candidate, and that a forced load failure
   shows the error + fallback.
