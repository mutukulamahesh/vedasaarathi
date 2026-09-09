# App-hosted puja audio — manifest v1

The player (`components/platform/audio-player.tsx`) and the manifest
(`lib/audio/manifest.ts`) are complete. **No MP3 files are bundled yet**, so
every asset is `status: "PLANNED"` and the player shows its honest
"being finalised" state. The device-voice control stays only as a clearly
labelled temporary fallback for *plain instructions* — never for a mantra.

This directory is where the generated files go. Filenames are fixed by the
manifest; drop the files here and flip the matching asset's `status` in
`lib/audio/manifest.ts` to `GENERATED` (plain instructions) or
`REVIEW_CANDIDATE` (mantra audio).

## File names (served from `/audio/v1/...`)

| Kind | Pattern | Count | Language |
| --- | --- | --- | --- |
| Plain instruction | `<stepId>.en.plain.mp3` | one per step | Indian English (`en-IN`) |
| Plain instruction | `<stepId>.te.plain.mp3` | one per step | Indian Telugu (`te-IN`) |
| Mantra candidate | `<stepId>.mantra.te.mp3` | one per mantra step | Indian Telugu (`te-IN`) |

`stepId` values come from `RITUAL_STEPS[].id`. Run
`node -e "import('./lib/audio/manifest.ts')"` via the test harness, or read
`AUDIO_MANIFEST`, for the exact list. Current totals:
`audioManifestSummary()` → `{ total, planned, mantraSlots }`.

## What each file must say

- **Plain instruction (EN):** `RitualStep.what + " " + RitualStep.how` verbatim.
- **Plain instruction (TE):** the authored Telugu in
  `lib/content/step-guidance-te.ts` when present; otherwise the English draft
  (do **not** invent Telugu for the recording).
- **Mantra candidate (TE):** `RitualStep.mantraTeluguScript` verbatim,
  transcription unchanged. This is a **review candidate** only. It must never
  be labelled verified or priest-approved anywhere in the UI or metadata.

Do **not** re-word, complete, or "correct" any mantra text for the recording.

## Generation — BLOCKED: needs a provider + credential + explicit approval

This environment has no text-to-speech provider configured and no approval to
send puja text to a third-party service (`.claude/rules/security.md`:
"Do not send user or sacred-source data to an external AI service without
explicit approval"). To produce the files, the project owner must choose a
neural TTS provider and supply a credential, then run the generator.

### Option A — Azure AI Speech (recommended: has native `te-IN` neural voices)

- Voices: `te-IN-MohanNeural` / `te-IN-ShrutiNeural` (Telugu),
  `en-IN-PrabhatNeural` / `en-IN-NeerjaNeural` (Indian English).
- Credential: `SPEECH_KEY` + `SPEECH_REGION` (Azure Speech resource).
- Command (once a `scripts/generate-audio.mjs` driver is added):

  ```
  SPEECH_KEY=xxxxxxxx SPEECH_REGION=centralindia \
    node scripts/generate-audio.mjs --provider azure --manifest v1 --out public/audio/v1
  ```

  The driver iterates `AUDIO_MANIFEST`, calls the Azure Speech REST endpoint
  `https://<region>.tts.speech.microsoft.com/cognitiveservices/v1` with SSML
  (`<voice name="te-IN-MohanNeural">…</voice>`, `audio-24khz-48kbitrate-mono-mp3`),
  and writes each `asset.src` file.

### Option B — Google Cloud Text-to-Speech

- Voices: `te-IN-Standard-A/B` or `te-IN-Wavenet-*`; `en-IN-Wavenet-*`.
- Credential: `GOOGLE_APPLICATION_CREDENTIALS` (service-account JSON with the
  Cloud Text-to-Speech API enabled).
- Command:

  ```
  GOOGLE_APPLICATION_CREDENTIALS=/path/sa.json \
    node scripts/generate-audio.mjs --provider google --manifest v1 --out public/audio/v1
  ```

### Option C — a self-hosted Indic TTS (e.g. AI4Bharat Indic-TTS)

- No third-party data transfer. Needs a GPU host and the model weights.
- Command:

  ```
  INDIC_TTS_URL=http://localhost:8000 \
    node scripts/generate-audio.mjs --provider indic-tts --manifest v1 --out public/audio/v1
  ```

After generation: run `npm test`, then a browser check that Play / Pause /
Replay / Stop work for a plain-instruction step and a mantra step, that the
mantra audio is labelled a review candidate, and that no step falls back to a
device voice for the mantra.
