// Generate the family dynamic-audio Sankalpam clips (item 3): Part A, the name
// pause prompt, and Part B. Telugu only (te-IN-MohanNeural). The family speaks
// their own names during the pause — NAMES ARE NEVER IN THESE CLIPS and are
// never sent to Azure.
//
// SAFETY: no network call without SPEECH_KEY + SPEECH_REGION in the env AND
// --i-have-approval AND --confirm-mantra (this is a sacred formula). Without
// them it is a DRY RUN. SPEECH_KEY is never printed.
//
//   node scripts/generate-sankalpam-audio.mjs                       # dry run
//   node --env-file=.env scripts/generate-sankalpam-audio.mjs \
//     --i-have-approval --confirm-mantra                            # real

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { withProjectModule } from "./lib/vite-load.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUT_DIR = join(ROOT, "public/audio/v1");
const INDEX = join(ROOT, "lib/audio/generated-sankalpam.json");
const sha256 = (t) => createHash("sha256").update(t, "utf8").digest("hex");

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const RATE = "-10%";
const VOICE = "te-IN-MohanNeural";
const HAS_APPROVAL = flag("i-have-approval");
const CONFIRM = flag("confirm-mantra");
const KEY = process.env.SPEECH_KEY || "";
const REGION = process.env.SPEECH_REGION || "";
const willCall = HAS_APPROVAL && CONFIRM && KEY && REGION;

const xmlEscape = (s) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

async function azure(text) {
  const ssml =
    `<speak version="1.0" xml:lang="te-IN"><voice name="${VOICE}">` +
    `<prosody rate="${RATE}">${xmlEscape(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "Ocp-Apim-Subscription-Key": KEY,
      "User-Agent": "vedasaarathi-sankalpam-audio",
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure TTS ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

await withProjectModule("/lib/sankalpam/family-audio.ts", async (m) => {
  const clips = [
    ["partA", m.FAMILY_SANKALPAM_AUDIO.partA],
    ["namePrompt", m.FAMILY_SANKALPAM_AUDIO.namePrompt],
    ["partB", m.FAMILY_SANKALPAM_AUDIO.partB],
  ];

  console.log(`sankalpam-audio  voice=${VOICE}  rate=${RATE}  mode=${willCall ? "GENERATE" : "DRY RUN"}`);
  if (!willCall) {
    console.log(
      (HAS_APPROVAL ? "" : "  missing: --i-have-approval\n") +
      (CONFIRM ? "" : "  missing: --confirm-mantra\n") +
      (KEY ? "" : "  missing: SPEECH_KEY (env)\n") +
      (REGION ? "" : "  missing: SPEECH_REGION (env)"),
    );
  }

  let doc = { version: 1, note: "", voice: VOICE, files: [] };
  if (existsSync(INDEX)) {
    try { doc = JSON.parse(readFileSync(INDEX, "utf8")); } catch { /* start fresh */ }
  }
  doc.files = doc.files ?? [];

  let generated = 0;
  for (const [name, clip] of clips) {
    const file = join(OUT_DIR, clip.src.split("/").pop());
    const hash = sha256(clip.text);
    console.log(`\n• ${clip.src.split("/").pop()}  textSha256=${hash}  bytes(text)=${Buffer.byteLength(clip.text, "utf8")}`);

    if (existsSync(file) && existsSync(`${file}.sha256`) &&
        readFileSync(`${file}.sha256`, "utf8").trim() === hash) {
      console.log("  RESULT: SKIP — already present, hash matches");
      continue;
    }
    if (!willCall) continue;

    let bytes;
    try {
      bytes = await azure(clip.text);
    } catch (err) {
      console.log(`  RESULT: FAILED — ${err.message}`);
      continue;
    }
    writeFileSync(file, bytes);
    writeFileSync(`${file}.txt`, clip.text);
    writeFileSync(`${file}.sha256`, hash);
    writeFileSync(`${file}.meta.json`, JSON.stringify({
      provider: "azure", voice: VOICE, rate: RATE, kind: "MANTRA_CANDIDATE", language: "TE",
      status: "REVIEW_CANDIDATE", role: name, textSha256: hash, generatedAt: new Date().toISOString(),
    }, null, 2));
    doc.files = doc.files.filter((f) => f.src !== clip.src);
    doc.files.push({ src: clip.src, role: name, voice: VOICE, rate: RATE, textSha256: hash, status: "REVIEW_CANDIDATE", generatedAt: new Date().toISOString() });
    generated += 1;
    console.log(`  RESULT: OK — ${bytes.length} bytes + sidecars`);
    await new Promise((r) => setTimeout(r, 1200));
  }

  doc.files.sort((a, b) => a.src.localeCompare(b.src));
  writeFileSync(INDEX, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`\nDone. generated=${generated}. Index: ${INDEX.replace(ROOT, "")}`);
  if (generated > 0) console.log("Next: node scripts/validate-audio.mjs && npm test");
});
