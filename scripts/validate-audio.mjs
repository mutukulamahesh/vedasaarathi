// Build-time validator for app-hosted puja audio.
//
// Guarantees:
//   - every manifest asset marked GENERATED / REVIEW_CANDIDATE has a real file
//     under public/ that is non-empty and a valid MP3 (ID3 tag or MPEG frame
//     sync), plus a "<file>.txt" sidecar whose contents match the manifest
//     text, and a "<file>.sha256" sidecar matching sha256(text);
//   - no stray .mp3 exists under public/audio that the manifest does not claim;
//   - no Telugu asset carries English text (Telugu assets must contain Telugu
//     script and must not equal the English asset's text).
//
// Fast path: if there are zero audio files under public/audio, there is
// nothing to cross-check and the Vite module load is skipped entirely.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PUBLIC = join(ROOT, "public");
const AUDIO_DIR = join(PUBLIC, "audio");

const sha256 = (t) => createHash("sha256").update(t, "utf8").digest("hex");
const TELUGU = /[ఀ-౿]/;

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function isValidMp3(buf) {
  if (buf.length < 4) return false;
  if (buf.slice(0, 3).toString("latin1") === "ID3") return true; // ID3v2
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0; // MPEG frame sync
}

const fail = [];
const note = (m) => fail.push(m);

const files = walk(AUDIO_DIR);
const mp3s = files.filter((f) => f.endsWith(".mp3"));

if (mp3s.length === 0) {
  console.log("audio: 0 generated files under public/audio — nothing to validate (all assets PLANNED).");
  process.exit(0);
}

const { withProjectModule } = await import("./lib/vite-load.mjs");

await withProjectModule("/lib/audio/manifest.ts", (m) => {
  const manifest = m.AUDIO_MANIFEST;
  const byEnPlain = new Map(
    manifest.filter((a) => a.kind === "PLAIN_INSTRUCTION" && a.language === "EN").map((a) => [a.stepId, a]),
  );
  const claimed = new Set();

  for (const asset of manifest) {
    claimed.add(join(PUBLIC, asset.src));

    // Telugu assets must not carry English text.
    if (asset.language === "TE") {
      if (!TELUGU.test(asset.text)) note(`${asset.src}: Telugu asset text has no Telugu script`);
      const en = byEnPlain.get(asset.stepId);
      if (en && en.text.trim() && en.text.trim() === asset.text.trim()) {
        note(`${asset.src}: Telugu asset text is identical to the English asset text`);
      }
    }
    if (!asset.text || !asset.text.trim()) note(`${asset.src}: manifest asset has empty narration text`);

    const file = join(PUBLIC, asset.src);

    if (asset.status === "PLANNED") {
      if (existsSync(file)) {
        note(`${asset.src}: a file is present but the manifest still says PLANNED — set its status to GENERATED / REVIEW_CANDIDATE`);
      }
      continue;
    }

    if (!existsSync(file)) { note(`${asset.src}: status ${asset.status} but the file is missing`); continue; }
    const buf = readFileSync(file);
    if (buf.length === 0) note(`${asset.src}: file is empty`);
    else if (!isValidMp3(buf)) note(`${asset.src}: not a valid MP3 (no ID3 tag or MPEG frame sync)`);

    const txt = `${file}.txt`;
    if (!existsSync(txt)) note(`${asset.src}: missing "<file>.txt" text sidecar`);
    else if (readFileSync(txt, "utf8").trim() !== asset.text.trim())
      note(`${asset.src}: "<file>.txt" does not match the manifest narration text`);

    const hashFile = `${file}.sha256`;
    if (!existsSync(hashFile)) note(`${asset.src}: missing "<file>.sha256" sidecar`);
    else if (readFileSync(hashFile, "utf8").trim() !== sha256(asset.text))
      note(`${asset.src}: "<file>.sha256" does not match sha256(manifest text) — regenerate this asset`);

    if (asset.kind === "MANTRA_CANDIDATE" && asset.status !== "REVIEW_CANDIDATE")
      note(`${asset.src}: a delivered mantra file must be status REVIEW_CANDIDATE, not ${asset.status}`);
  }

  // Any .mp3 under public/audio the manifest does not claim is an error.
  for (const f of mp3s) {
    if (!claimed.has(f)) note(`${relative(PUBLIC, f)}: audio file present but no manifest asset claims it`);
  }
});

if (fail.length) {
  console.error(`audio validation FAILED (${fail.length}):`);
  for (const m of fail) console.error(`  - ${m}`);
  process.exit(1);
}
console.log(`audio: ${mp3s.length} file(s) present, all valid and manifest-matched.`);
