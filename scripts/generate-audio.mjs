// Generate app-hosted puja audio from the manifest.
//
// This script is COMPLETE but deliberately inert without an explicit opt-in:
// it never contacts Azure and carries no credentials. Sending puja text to a
// third-party TTS needs the project owner's explicit approval
// (.claude/rules/security.md). Without SPEECH_KEY + SPEECH_REGION and the
// --i-have-approval flag it prints exactly what it WOULD send and writes
// nothing.
//
// Usage:
//   node scripts/generate-audio.mjs --kind en-plain
//   node scripts/generate-audio.mjs --kind te-plain
//   node scripts/generate-audio.mjs --kind te-mantra --confirm-mantra
//
//   # to actually generate (owner only):
//   SPEECH_KEY=... SPEECH_REGION=centralindia \
//     node scripts/generate-audio.mjs --kind te-plain --i-have-approval
//
// Flags:
//   --kind <en-plain|te-plain|te-mantra>   which assets to generate (required)
//   --confirm-mantra                        REQUIRED for --kind te-mantra
//   --i-have-approval                       REQUIRED to make any network call
//   --out <dir>                             output dir (default public/audio/v1)
//   --voice <name>                          override the Azure voice
//   --limit <n>                             only the first n assets (testing)
//
// Provider adapters live in PROVIDERS; only "azure" is implemented. Each
// adapter turns (text, voice) into a request descriptor and, when a real call
// is authorised, performs it and returns MP3 bytes.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
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

const OUT_DIR = join(ROOT, opt("out", "public/audio/v1"));
const VOICE_OVERRIDE = opt("voice");
const LIMIT = opt("limit") ? Number(opt("limit")) : Infinity;
const HAS_APPROVAL = flag("i-have-approval");
const SPEECH_KEY = process.env.SPEECH_KEY || "";
const SPEECH_REGION = process.env.SPEECH_REGION || "";

/* ---- provider adapters ------------------------------------------------------ */

const AZURE_VOICE = {
  "PLAIN_INSTRUCTION:EN": "en-IN-PrabhatNeural",
  "PLAIN_INSTRUCTION:TE": "te-IN-MohanNeural",
  "MANTRA_CANDIDATE:TE": "te-IN-MohanNeural",
};

function xmlEscape(s) {
  return s.replace(/[<>&'"]/g, (c) => (
    { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]
  ));
}

const PROVIDERS = {
  azure: {
    id: "azure",
    voiceFor(asset) {
      return VOICE_OVERRIDE || AZURE_VOICE[`${asset.kind}:${asset.language}`];
    },
    /** A fully-formed request descriptor. No secrets are embedded. */
    request(asset) {
      const voice = this.voiceFor(asset);
      const locale = asset.language === "TE" ? "te-IN" : "en-IN";
      const prosody =
        asset.kind === "MANTRA_CANDIDATE"
          ? '<prosody rate="-8%">'
          : '<prosody rate="-4%">';
      const ssml =
        `<speak version="1.0" xml:lang="${locale}">` +
        `<voice name="${voice}">${prosody}${xmlEscape(asset.text)}</prosody></voice></speak>`;
      return {
        method: "POST",
        url: `https://${SPEECH_REGION || "<REGION>"}.tts.speech.microsoft.com/cognitiveservices/v1`,
        headers: {
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "Ocp-Apim-Subscription-Key": SPEECH_KEY ? "<SPEECH_KEY set>" : "<SPEECH_KEY missing>",
          "User-Agent": "vedasaarathi-audio-generator",
        },
        body: ssml,
      };
    },
    async call(asset) {
      const req = this.request(asset);
      const res = await fetch(req.url, {
        method: req.method,
        headers: { ...req.headers, "Ocp-Apim-Subscription-Key": SPEECH_KEY },
        body: req.body,
      });
      if (!res.ok) throw new Error(`Azure TTS ${res.status} ${res.statusText}`);
      return Buffer.from(await res.arrayBuffer());
    },
  },
};

const provider = PROVIDERS.azure;

/* ---- run ------------------------------------------------------------------- */

await withProjectModule("/lib/audio/manifest.ts", async (m) => {
  const sel = KIND_MAP[KIND];
  const assets = m.AUDIO_MANIFEST
    .filter((a) => a.kind === sel.kind && a.language === sel.language)
    .slice(0, LIMIT);

  console.log(`kind=${KIND}  provider=azure  assets=${assets.length}  out=${opt("out", "public/audio/v1")}`);

  const willCall = HAS_APPROVAL && SPEECH_KEY && SPEECH_REGION;
  if (!willCall) {
    console.log(
      "\nDRY RUN — no network call, nothing written.\n" +
      (HAS_APPROVAL ? "" : "  missing: --i-have-approval\n") +
      (SPEECH_KEY ? "" : "  missing: SPEECH_KEY\n") +
      (SPEECH_REGION ? "" : "  missing: SPEECH_REGION\n"),
    );
  }

  let generated = 0;
  for (const asset of assets) {
    const req = provider.request(asset);
    const outFile = join(OUT_DIR, basename(asset.src));
    console.log(`\n• ${asset.src}`);
    console.log(`  voice: ${provider.voiceFor(asset)}   text sha256: ${sha256(asset.text)}`);
    console.log(`  ${req.method} ${req.url}`);
    console.log(`  ssml: ${req.body}`);

    if (!willCall) continue;

    if (asset.kind === "MANTRA_CANDIDATE") {
      console.log("  (mantra) writing as a REVIEW CANDIDATE — it will NOT be labelled priest-approved.");
    }
    const bytes = await provider.call(asset);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, bytes);
    writeFileSync(`${outFile}.txt`, asset.text);
    writeFileSync(`${outFile}.sha256`, sha256(asset.text));
    writeFileSync(`${outFile}.meta.json`, JSON.stringify({
      provider: provider.id,
      voice: provider.voiceFor(asset),
      kind: asset.kind,
      language: asset.language,
      status: asset.kind === "MANTRA_CANDIDATE" ? "REVIEW_CANDIDATE" : "GENERATED",
      textRef: asset.textRef,
      textSha256: sha256(asset.text),
      generatedAt: new Date().toISOString(),
    }, null, 2));
    generated += 1;
    console.log(`  wrote ${bytes.length} bytes + .txt + .sha256 + .meta.json`);
  }

  console.log(`\nDone. generated=${generated}`);
  if (generated > 0) {
    console.log("Next: set the matching asset status in lib/audio/manifest.ts, then run scripts/validate-audio.mjs.");
  }
});
