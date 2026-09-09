// Generate app-hosted puja audio from the manifest (Azure AI Speech).
//
// SAFETY
// - No credentials are embedded. A real call needs SPEECH_KEY + SPEECH_REGION
//   in the environment AND the --i-have-approval flag. Without them the script
//   is a DRY RUN: it makes no network call and writes nothing.
// - --kind te-mantra additionally requires --confirm-mantra.
// - SPEECH_KEY is never printed or logged.
// - Normal logs show only: filename, voice, text sha256, byte count, result.
//   Pass --show-text to also print the narration text / SSML (debugging only).
//
// USAGE
//   node scripts/generate-audio.mjs --kind te-plain                      # dry run
//   SPEECH_KEY=… SPEECH_REGION=eastus \
//     node scripts/generate-audio.mjs --kind te-plain --i-have-approval  # real
//
//   # one comparison sample (voice-tagged file, registered in
//   # lib/audio/generated-samples.json, does not touch the step assets):
//   node scripts/generate-audio.mjs --sample --kind te-plain --step bhuta-shuddhi \
//     --voice te-IN-ShrutiNeural --tag shruti --i-have-approval
//
// FLAGS
//   --kind <en-plain|te-plain|te-mantra>   required
//   --confirm-mantra                       required for --kind te-mantra
//   --i-have-approval                      required to make any network call
//   --sample                               one voice-tagged comparison file
//   --step <id>                            (sample mode) which step
//   --voice <name>                         Azure voice override
//   --tag <name>                           (sample mode) filename suffix
//   --rate <pct>                           SSML prosody rate, e.g. "-12%"
//   --out <dir>                            output dir (default public/audio/v1)
//   --limit <n>                            first n assets only (non-sample)
//   --show-text                            also print narration text / SSML

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { withProjectModule } from "./lib/vite-load.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const sha256 = (t) => createHash("sha256").update(t, "utf8").digest("hex");

/* ---- args ---------------------------------------------------------------- */

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const KIND = opt("kind");
const KIND_MAP = {
  "en-plain": { kind: "PLAIN_INSTRUCTION", language: "EN" },
  "te-plain": { kind: "PLAIN_INSTRUCTION", language: "TE" },
  "te-mantra": { kind: "MANTRA_CANDIDATE", language: "TE" },
};
if (!KIND || !KIND_MAP[KIND]) {
  console.error("Required: --kind en-plain | te-plain | te-mantra");
  process.exit(64);
}
if (KIND === "te-mantra" && !flag("confirm-mantra")) {
  console.error(
    "Refusing to generate mantra audio without --confirm-mantra.\n" +
    "Mantra audio is a review candidate; generating it is an explicit choice.",
  );
  process.exit(64);
}

const SAMPLE = flag("sample");
const SAMPLE_STEP = opt("step");
const SAMPLE_TAG = opt("tag");
if (SAMPLE && (!SAMPLE_STEP || !SAMPLE_TAG)) {
  console.error("--sample requires --step <id> and --tag <name>.");
  process.exit(64);
}

const OUT_DIR = join(ROOT, opt("out", "public/audio/v1"));
const SAMPLES_JSON = join(ROOT, "lib/audio/generated-samples.json");
const GENERATED_JSON = join(ROOT, "lib/audio/generated.json");
const VOICE_OVERRIDE = opt("voice");
const RATE_OVERRIDE = opt("rate");
const LIMIT = opt("limit") ? Number(opt("limit")) : Infinity;
const SHOW_TEXT = flag("show-text");
const HAS_APPROVAL = flag("i-have-approval");
const SPEECH_KEY = process.env.SPEECH_KEY || "";
const SPEECH_REGION = process.env.SPEECH_REGION || "";

/* ---- provider adapters --------------------------------------------------- */

const AZURE_VOICE = {
  "PLAIN_INSTRUCTION:EN": "en-IN-PrabhatNeural",
  "PLAIN_INSTRUCTION:TE": "te-IN-MohanNeural",
  "MANTRA_CANDIDATE:TE": "te-IN-MohanNeural",
};
const xmlEscape = (s) => s.replace(/[<>&'"]/g, (c) => (
  { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]
));

const PROVIDERS = {
  azure: {
    id: "azure",
    voiceFor(asset) {
      return VOICE_OVERRIDE || AZURE_VOICE[`${asset.kind}:${asset.language}`];
    },
    rateFor(asset) {
      return RATE_OVERRIDE || (asset.kind === "MANTRA_CANDIDATE" ? "-8%" : "-4%");
    },
    ssml(asset) {
      const voice = this.voiceFor(asset);
      const locale = asset.language === "TE" ? "te-IN" : "en-IN";
      return (
        `<speak version="1.0" xml:lang="${locale}">` +
        `<voice name="${voice}"><prosody rate="${this.rateFor(asset)}">` +
        `${xmlEscape(asset.text)}</prosody></voice></speak>`
      );
    },
    url() {
      return `https://${SPEECH_REGION || "<REGION>"}.tts.speech.microsoft.com/cognitiveservices/v1`;
    },
    async call(asset) {
      // The subscription key is used only here, in the request header - never
      // returned, printed, or stored.
      const res = await fetch(this.url(), {
        method: "POST",
        headers: {
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "Ocp-Apim-Subscription-Key": SPEECH_KEY,
          "User-Agent": "vedasaarathi-audio-generator",
        },
        body: this.ssml(asset),
      });
      if (!res.ok) throw new Error(`Azure TTS ${res.status} ${res.statusText}`);
      return Buffer.from(await res.arrayBuffer());
    },
  },
};
const provider = PROVIDERS.azure;

/* ---- run --------------------------------------------------------------------- */

function writeSidecars(outFile, asset, voice, rate, statusForMeta) {
  writeFileSync(`${outFile}.txt`, asset.text);
  writeFileSync(`${outFile}.sha256`, sha256(asset.text));
  writeFileSync(`${outFile}.meta.json`, JSON.stringify({
    provider: provider.id, voice, rate,
    kind: asset.kind, language: asset.language,
    status: statusForMeta,
    textRef: asset.textRef, textSha256: sha256(asset.text),
    generatedAt: new Date().toISOString(),
  }, null, 2));
}

function registerSample(entry) {
  let doc = { version: 1, samples: [] };
  if (existsSync(SAMPLES_JSON)) {
    try { doc = JSON.parse(readFileSync(SAMPLES_JSON, "utf8")); } catch { /* start fresh */ }
  }
  doc.samples = (doc.samples || []).filter((s) => s.src !== entry.src);
  doc.samples.push(entry);
  doc.samples.sort((a, b) => a.src.localeCompare(b.src));
  writeFileSync(SAMPLES_JSON, `${JSON.stringify(doc, null, 2)}\n`);
}

// Auto-update the manifest for a successful per-step file: record it in
// generated.json so lib/audio/manifest.ts flips the asset to GENERATED /
// REVIEW_CANDIDATE with the voice actually used.
function registerStep(entry) {
  let doc = { version: 1, defaultTeluguVoice: "te-IN-MohanNeural", files: [] };
  if (existsSync(GENERATED_JSON)) {
    try { doc = JSON.parse(readFileSync(GENERATED_JSON, "utf8")); } catch { /* start fresh */ }
  }
  doc.files = (doc.files || []).filter((s) => s.src !== entry.src);
  doc.files.push(entry);
  doc.files.sort((a, b) => a.src.localeCompare(b.src));
  writeFileSync(GENERATED_JSON, `${JSON.stringify(doc, null, 2)}\n`);
}

await withProjectModule("/lib/audio/manifest.ts", async (m) => {
  const sel = KIND_MAP[KIND];
  const sampleSrcs = new Set((m.AUDIO_SAMPLES ?? []).map((s) => s.src));
  // Only ever operate on the per-step assets, never on already-registered
  // comparison samples.
  let assets = m.AUDIO_MANIFEST.filter(
    (a) => a.kind === sel.kind && a.language === sel.language && !sampleSrcs.has(a.src),
  );
  if (SAMPLE) assets = assets.filter((a) => a.stepId === SAMPLE_STEP);
  else assets = assets.slice(0, LIMIT);

  if (SAMPLE && assets.length === 0) {
    console.error(`No ${KIND} asset for step "${SAMPLE_STEP}".`);
    process.exit(65);
  }

  const willCall = HAS_APPROVAL && SPEECH_KEY && SPEECH_REGION;
  console.log(
    `kind=${KIND}${SAMPLE ? ` sample step=${SAMPLE_STEP} tag=${SAMPLE_TAG}` : ""}` +
    `  provider=azure  region=${SPEECH_REGION || "(unset)"}  assets=${assets.length}` +
    `  mode=${willCall ? "GENERATE" : "DRY RUN"}`,
  );
  if (!willCall) {
    console.log(
      (HAS_APPROVAL ? "" : "  missing: --i-have-approval\n") +
      (SPEECH_KEY ? "" : "  missing: SPEECH_KEY (env)\n") +
      (SPEECH_REGION ? "" : "  missing: SPEECH_REGION (env)"),
    );
  }

  let generated = 0;
  for (const asset of assets) {
    const voice = provider.voiceFor(asset);
    const rate = provider.rateFor(asset);
    const outName = SAMPLE
      ? basename(asset.src).replace(/\.mp3$/, `.${SAMPLE_TAG}.mp3`)
      : basename(asset.src);
    const outFile = join(OUT_DIR, outName);
    const srcPath = `/audio/v1/${outName}`;
    const statusForMeta = asset.kind === "MANTRA_CANDIDATE" ? "REVIEW_CANDIDATE" : "GENERATED";

    console.log(
      `\n• ${outName}\n` +
      `  voice=${voice}  rate=${rate}  textSha256=${sha256(asset.text)}`,
    );
    if (SHOW_TEXT) console.log(`  text: ${asset.text}\n  ssml: ${provider.ssml(asset)}`);

    if (!willCall) continue;

    let bytes;
    try {
      bytes = await provider.call(asset);
    } catch (err) {
      console.log(`  RESULT: FAILED — ${err.message}`);
      continue;
    }
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, bytes);
    writeSidecars(outFile, asset, voice, rate, statusForMeta);
    if (SAMPLE) {
      registerSample({
        src: srcPath, stepId: asset.stepId, kind: asset.kind, language: asset.language,
        voice, rate, tag: SAMPLE_TAG, textRef: asset.textRef, textSha256: sha256(asset.text),
        status: statusForMeta, generatedAt: new Date().toISOString(),
      });
    } else {
      registerStep({
        src: srcPath, stepId: asset.stepId, kind: asset.kind, language: asset.language,
        voice, rate, textRef: asset.textRef, textSha256: sha256(asset.text),
        status: statusForMeta, generatedAt: new Date().toISOString(),
      });
    }
    generated += 1;
    console.log(`  RESULT: OK — ${bytes.length} bytes + .txt + .sha256 + .meta.json`);
  }

  console.log(`\nDone. generated=${generated}`);
  if (generated > 0 && !SAMPLE) {
    console.log("Next: set the matching asset status in lib/audio/manifest.ts, then run scripts/validate-audio.mjs.");
  }
  if (generated > 0 && SAMPLE) {
    console.log(`Registered in ${basename(SAMPLES_JSON)}. Next: run scripts/validate-audio.mjs.`);
  }
});
