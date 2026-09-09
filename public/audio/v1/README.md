# App-hosted puja audio — manifest v1

The player (`components/platform/audio-player.tsx`), the manifest
(`lib/audio/manifest.ts`), the generator (`scripts/generate-audio.mjs`) and the
build-time validator (`scripts/validate-audio.mjs`) are complete.

**Default Telugu voice: `te-IN-MohanNeural`** (`DEFAULT_TELUGU_VOICE`, set in
`lib/audio/generated.json`).

Delivered so far (71 files):

| Set | Files | Voice / rate | Where |
| --- | --- | --- | --- |
| Telugu plain instructions | 35 (`<stepId>.te.plain.mp3`) | Mohan, `-4%`, `GENERATED` | every step — families |
| Telugu mantra pronunciation candidates | 32 (`<stepId>.mantra.te.mp3`) | Mohan, `-12%`, `REVIEW_CANDIDATE` | every mantra step — families |
| Voice-comparison samples | 4 (`bhuta-shuddhi.{te.plain,mantra.te}.{shruti,mohan}.mp3`) | Shruti + Mohan | **Reviewer mode only** |

English per-step audio is **not** generated yet — those assets stay `PLANNED`
and fall back to the device voice.

Telugu families now hear app-hosted audio with nothing to install; the
device-voice control no longer appears in Telugu mode. Mantra files are
internally "pronunciation candidates" — the family-facing line only says
"a computer voice, not a priest's recording", with no review-process wording.

The delivered files are recorded in `lib/audio/generated.json` (per step) and
`lib/audio/generated-samples.json` (samples). `lib/audio/manifest.ts` merges
them and flips each asset's status. `scripts/validate-audio.mjs` (run from
`npm run build`) fails the build if a delivered file is missing/empty/not an
MP3, if its `<file>.txt` / `<file>.sha256` sidecars don't match the manifest
text, or if a `.mp3` appears whose asset is still `PLANNED`.

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
node scripts/generate-audio.mjs --kind te-plain            # add --show-text to see the SSML

# owner, with an Azure AI Speech resource, actually generate a comparison sample:
SPEECH_KEY=xxxxxxxx SPEECH_REGION=eastus \
  node --env-file=.env scripts/generate-audio.mjs --sample --kind te-plain \
    --step bhuta-shuddhi --voice te-IN-ShrutiNeural --tag shruti --i-have-approval

# the full per-step set (not generated yet):
node --env-file=.env scripts/generate-audio.mjs --kind te-plain --i-have-approval
node --env-file=.env scripts/generate-audio.mjs --kind te-mantra --i-have-approval --confirm-mantra
```

Normal logs print only the filename, voice, text sha256, byte count and
result — never the narration text or SSML, and never `SPEECH_KEY`. Add
`--show-text` for debugging.

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
